import "server-only";
import { Preference } from "mercadopago";
import { Prisma, type CouponScope, type ListingKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getListingPrices } from "@/lib/listing-prices";
import { defaultUsageText } from "@/lib/plan-rules";
import { COUPON_RESERVATION_MINUTES, CouponUnavailableError, evaluateCoupon, withCouponReservation } from "@/lib/coupons";
import { billingSnapshot, parseBilling, type BillingData } from "@/lib/billing-rules";
import { appUrl, mpClient, notificationUrl } from "@/lib/mercadopago";
import { activatePurchase } from "@/lib/payments/activation";
import { getBillingSettings } from "@/lib/billing-settings";
import { startSubscription } from "@/lib/payments/subscriptions";

// VA-92 · Etapa 1: compra de pago único con Checkout Pro. No hay planes de 1 publicación: una
// publicación suelta se paga desde su aviso "pendiente de pago" al precio de ListingPrice. El producto y el precio se resuelven
// siempre en el servidor a partir de un "producto" que viaja en la URL (?planId=… o ?listing=…).
// La compra queda PENDING y la activa el webhook; con un cupón del 100% se activa acá, sin pasar
// por Mercado Pago ni facturar.

export type ListingType = "aircraft" | "parts" | "hangar";

const LISTING_KIND: Record<ListingType, ListingKind> = { aircraft: "AIRCRAFT", parts: "SPARE_PART", hangar: "HANGAR" };
const KIND_TEXT: Record<ListingKind, { one: string; detail: (id: string) => string }> = {
  AIRCRAFT: { one: "Publicación de aeronave", detail: (id) => `/planes/plane-details/${id}` },
  SPARE_PART: { one: "Publicación de repuesto", detail: (id) => `/spareparts/sparepart-details/${id}` },
  HANGAR: { one: "Publicación de hangar", detail: (id) => `/services/hangars/hangar-details/${id}` },
};
const PACK_TEXT: Record<string, string> = {
  AIRCRAFT_PACK: "Publicación de aeronaves",
  SPARE_PART_PACK: "Publicación de repuestos",
  HANGAR_PACK: "Publicación de hangares",
  AD_BANNER: "Espacio publicitario",
  SUBSCRIPTION: "Suscripción",
};
const PLAN_SCOPE: Record<string, CouponScope> = {
  AIRCRAFT_PACK: "AIRCRAFT",
  SPARE_PART_PACK: "SPARE_PART",
  HANGAR_PACK: "HANGAR",
  AD_BANNER: "AD_BANNER",
  SUBSCRIPTION: "ALL",
};

export type CheckoutProduct = {
  /** Lo que viaja en el formulario para volver a resolverlo en la action ("plan:<id>", "listing:aircraft:<id>"…). */
  key: string;
  name: string;
  /** Concepto de la compra y de la factura ("Publicación de aeronave – Cessna 182 2015"). */
  description: string;
  includes: string;
  price: number;
  currency: string;
  scope: CouponScope;
  recurring: boolean;
  billingPer: "mes" | "año";
  planId: string | null;
  listingKind: ListingKind | null;
  listing: { type: ListingType; id: string; title: string; href: string } | null;
};

export type ProductQuery = { planId?: string; listing?: string };

/** Resuelve el producto a cobrar. Los avisos tienen que ser del usuario y estar pendientes de pago. */
export async function resolveProduct(userId: string, q: ProductQuery): Promise<CheckoutProduct | { error: string }> {
  const prices = await getListingPrices();

  if (q.listing) {
    const [type, id] = q.listing.split(":") as [ListingType, string];
    const kind = LISTING_KIND[type];
    if (!kind || !id) return { error: "No encontramos el aviso a pagar." };
    const where = { id, sellerId: userId };
    const listing =
      kind === "AIRCRAFT"
        ? await prisma.aircraft.findFirst({ where, select: { id: true, title: true, status: true } })
        : kind === "SPARE_PART"
          ? await prisma.sparePart.findFirst({ where, select: { id: true, title: true, status: true } })
          : await prisma.hangar.findFirst({ where, select: { id: true, title: true, status: true } });
    if (!listing) return { error: "No encontramos el aviso a pagar." };
    if (listing.status !== "PENDING_PAYMENT") return { error: "Este aviso ya no está pendiente de pago." };
    const text = KIND_TEXT[kind];
    return {
      key: `listing:${type}:${id}`,
      name: "Publicación individual",
      description: `${text.one} – ${listing.title}`.slice(0, 250),
      includes: `Tu aviso “${listing.title}”, visible 45 días`,
      price: prices[kind].amount,
      currency: "ARS",
      scope: kind,
      recurring: false,
      billingPer: "mes",
      planId: null,
      listingKind: kind,
      listing: { type, id, title: listing.title, href: text.detail(id) },
    };
  }

  const planId = q.planId ?? "";
  if (!planId) return { error: "Elegí un plan para continuar." };
  const plan = await prisma.plan.findFirst({ where: { id: planId, isActive: true, archivedAt: null } });
  if (!plan) return { error: "Ese plan no está disponible." };
  return {
    key: `plan:${plan.id}`,
    name: plan.name,
    description: `${PACK_TEXT[plan.type] ?? "Plan"} – ${plan.name}`,
    includes: plan.usageDescription || defaultUsageText(plan),
    price: Number(plan.price),
    currency: plan.currency,
    scope: PLAN_SCOPE[plan.type] ?? "ALL",
    recurring: plan.billingType === "SUBSCRIPTION",
    billingPer: plan.billingInterval === "YEARLY" ? "año" : "mes",
    planId: plan.id,
    listingKind: null,
    listing: null,
  };
}

export function productQueryFromKey(key: string): ProductQuery {
  if (key.startsWith("listing:")) return { listing: key.slice("listing:".length) };
  if (key.startsWith("plan:")) return { planId: key.slice("plan:".length) };
  return {};
}

export { getBillingSettings };

export type CheckoutResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Crea (o reutiliza) la compra y la preferencia de Mercado Pago, o activa directo si queda en $0. */
export async function startCheckout(input: {
  userId: string;
  userEmail: string | null;
  productKey: string;
  couponCode?: string;
  billing: unknown;
  /** Suscripciones: email de la cuenta de Mercado Pago que autoriza el débito. */
  payerEmail?: string;
}): Promise<CheckoutResult> {
  const product = await resolveProduct(input.userId, productQueryFromKey(input.productKey));
  if ("error" in product) return { ok: false, error: product.error };
  if (product.recurring) {
    // VA-92 · Etapa 2: suscripción con débito automático (preapproval). Sin cupón.
    return startSubscription({ userId: input.userId, planId: product.planId!, billing: input.billing, payerEmail: input.payerEmail });
  }
  if (product.currency !== "ARS") return { ok: false, error: "Por ahora solo se cobra en pesos." };

  let couponId: string | null = null;
  let discountAmount = 0;
  let finalPrice = product.price;
  if (input.couponCode?.trim()) {
    const coupon = await evaluateCoupon({ code: input.couponCode, userId: input.userId, scope: product.scope, price: product.price });
    if (!coupon.ok) return { ok: false, error: coupon.error, fieldErrors: { coupon: coupon.error } };
    couponId = coupon.coupon.id;
    discountAmount = coupon.discountAmount;
    finalPrice = coupon.finalPrice;
  }

  const settings = await getBillingSettings();
  const billing = parseBilling(input.billing, finalPrice, settings.dniRequiredFrom);
  if (!billing.ok) return { ok: false, error: "Revisá los datos de facturación.", fieldErrors: billing.fieldErrors };

  await saveBillingProfile(input.userId, billing.data);
  const money = { couponId, discountAmount, finalPrice, snapshot: billingSnapshot(billing.data) };
  let purchaseId: string;
  if (couponId) {
    // VA-105 · 2.4: con cupón, la compra se guarda reservando un uso (fila del cupón bloqueada).
    try {
      purchaseId = await withCouponReservation(
        { couponId, userId: input.userId, reusePurchaseId: await openPurchaseId(input.userId, product) },
        (tx) => upsertPurchase(tx, input.userId, product, money)
      );
    } catch (error) {
      if (error instanceof CouponUnavailableError) return { ok: false, error: error.message, fieldErrors: { coupon: error.message } };
      throw error;
    }
  } else {
    purchaseId = await upsertPurchase(prisma, input.userId, product, money);
  }

  const statusUrl = `/payment/status?purchase=${purchaseId}`;
  // Cupón del 100%: se activa directo, sin Mercado Pago ni factura.
  if (finalPrice <= 0) {
    await activatePurchase(purchaseId);
    return { ok: true, redirectTo: statusUrl };
  }

  const base = appUrl();
  const back = `${base}${statusUrl}`;
  const preference = await new Preference(mpClient()).create({
    body: {
      items: [
        {
          id: purchaseId,
          title: product.description,
          description: product.includes,
          quantity: 1,
          unit_price: finalPrice,
          currency_id: "ARS",
          category_id: "services",
        },
      ],
      payer: { email: billing.data.email || input.userEmail || undefined, name: billing.data.name },
      external_reference: purchaseId,
      back_urls: { success: back, pending: back, failure: back },
      // Mercado Pago solo acepta auto_return con una URL https (en local, http, se vuelve a mano).
      ...(base.startsWith("https://") ? { auto_return: "approved" } : {}),
      notification_url: withSourceNews(notificationUrl()),
      statement_descriptor: "VENTAS AERO",
      expires: true,
      // Con cupón, el link vence junto con la reserva del uso; sin cupón, en 3 días.
      expiration_date_to: new Date(Date.now() + (couponId ? COUPON_RESERVATION_MINUTES * 60_000 : 3 * 24 * 60 * 60 * 1000)).toISOString(),
      metadata: { purchase_id: purchaseId },
    },
  });
  if (!preference.id || !preference.init_point) throw new Error("Mercado Pago no devolvió la preferencia.");
  await prisma.purchase.update({ where: { id: purchaseId }, data: { mpPreferenceId: preference.id } });
  return { ok: true, redirectTo: preference.init_point };
}

/** Solo las notificaciones "webhooks" (firmadas), no las IPN viejas sin firma. */
function withSourceNews(url: string): string {
  return url.includes("source_news=") ? url : `${url}${url.includes("?") ? "&" : "?"}source_news=webhooks`;
}

async function saveBillingProfile(userId: string, data: BillingData) {
  const s = billingSnapshot(data);
  const fields = {
    kind: data.kind,
    name: s.name,
    docType: s.docType,
    docNumber: s.docNumber,
    ivaCondition: s.ivaCondition,
    email: s.email,
    address: s.address,
  };
  await prisma.billingProfile.upsert({ where: { userId }, create: { userId, ...fields }, update: fields });
}

/**
 * Un aviso pendiente de pago tiene una sola compra abierta: si el usuario vuelve a intentar, se
 * actualiza esa (precio, cupón, datos) en vez de crear otra. Así, pague la preferencia que pague,
 * el webhook activa el mismo aviso.
 */
/** Compra abierta (sin activar) del aviso pendiente, si la hay: se reutiliza al reintentar. */
async function openPurchaseId(userId: string, product: CheckoutProduct): Promise<string | null> {
  if (!product.listing) return null;
  const { type, id } = product.listing;
  const select = { purchase: { select: { id: true, activatedAt: true, userId: true } } };
  const current =
    type === "aircraft"
      ? await prisma.aircraft.findUnique({ where: { id }, select })
      : type === "parts"
        ? await prisma.sparePart.findUnique({ where: { id }, select })
        : await prisma.hangar.findUnique({ where: { id }, select });
  return current?.purchase && !current.purchase.activatedAt && current.purchase.userId === userId ? current.purchase.id : null;
}

async function upsertPurchase(
  db: Prisma.TransactionClient | typeof prisma,
  userId: string,
  product: CheckoutProduct,
  money: { couponId: string | null; discountAmount: number; finalPrice: number; snapshot: object }
): Promise<string> {
  const data = {
    description: product.description,
    currency: product.currency,
    originalPrice: new Prisma.Decimal(product.price),
    discountAmount: new Prisma.Decimal(money.discountAmount),
    finalPrice: new Prisma.Decimal(money.finalPrice),
    couponId: money.couponId,
    billingSnapshot: money.snapshot as Prisma.InputJsonValue,
    paymentStatus: "PENDING" as const,
  };

  if (product.listing) {
    const { type, id } = product.listing;
    const current =
      type === "aircraft"
        ? await db.aircraft.findUnique({ where: { id }, select: { purchase: { select: { id: true, activatedAt: true, userId: true } } } })
        : type === "parts"
          ? await db.sparePart.findUnique({ where: { id }, select: { purchase: { select: { id: true, activatedAt: true, userId: true } } } })
          : await db.hangar.findUnique({ where: { id }, select: { purchase: { select: { id: true, activatedAt: true, userId: true } } } });
    const open = current?.purchase && !current.purchase.activatedAt && current.purchase.userId === userId ? current.purchase : null;
    if (open) {
      await db.purchase.update({ where: { id: open.id }, data });
      return open.id;
    }
    const created = await db.purchase.create({ data: { userId, listingKind: product.listingKind, ...data }, select: { id: true } });
    const link = { where: { id }, data: { purchaseId: created.id } };
    if (type === "aircraft") await db.aircraft.update(link);
    else if (type === "parts") await db.sparePart.update(link);
    else await db.hangar.update(link);
    return created.id;
  }

  const created = await db.purchase.create({
    data: { userId, planId: product.planId, listingKind: product.listingKind, ...data },
    select: { id: true },
  });
  return created.id;
}
