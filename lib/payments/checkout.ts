import "server-only";
import { Preference } from "mercadopago";
import { Prisma, type CouponScope } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { defaultUsageText } from "@/lib/plan-rules";
import { CouponUnavailableError, evaluateCoupon, withCouponReservation } from "@/lib/coupons";
import { PENDING_PAYMENT_MINUTES } from "@/lib/payments/pending";
import { billingSnapshot, parseBilling, type BillingData } from "@/lib/billing-rules";
import { appUrl, mpClient, notificationUrl } from "@/lib/mercadopago";
import { activatePurchase } from "@/lib/payments/activation";
import { getBillingSettings } from "@/lib/billing-settings";
import { startSubscription } from "@/lib/payments/subscriptions";

// VA-92: el producto y el precio se resuelven siempre en el servidor a partir de un "producto" que
// viaja en la URL (?planId=…). Las suscripciones van por débito automático (lib/payments/subscriptions);
// un plan de pago único (hoy no hay; queda para banners, VA-103) usa Checkout Pro: la compra queda
// PENDING y la activa el webhook; con un cupón del 100% se activa acá, sin pasar por Mercado Pago.
// VA-152: ya no se cobra por aviso, pack ni renovación.
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
};

export type ProductQuery = { planId?: string };

/** Resuelve el producto a cobrar. VA-152: solo planes (ya no se paga por aviso, pack ni renovación). */
export async function resolveProduct(userId: string, q: ProductQuery): Promise<CheckoutProduct | { error: string }> {
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
  };
}

export function productQueryFromKey(key: string): ProductQuery {
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
        { couponId, userId: input.userId, reusePurchaseId: null },
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
      // En local (http) Mercado Pago no puede avisar: el pago se procesa con scripts/process-mp-payment.ts.
      ...(notificationUrl().startsWith("https://") ? { notification_url: withSourceNews(notificationUrl()) } : {}),
      statement_descriptor: "VENTAS AERO",
      expires: true,
      // VA-140: el link vence a los 5 minutos (después la compra se muestra cancelada y se reintenta).
      // Sin efectivo ni cajero (Rapipago, Pago Fácil, red Link): esos pagos quedan pendientes días.
      expiration_date_to: new Date(Date.now() + PENDING_PAYMENT_MINUTES * 60_000).toISOString(),
      payment_methods: { excluded_payment_types: [{ id: "ticket" }, { id: "atm" }] },
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

  const created = await db.purchase.create({
    data: { userId, planId: product.planId, ...data },
    select: { id: true },
  });
  return created.id;
}

