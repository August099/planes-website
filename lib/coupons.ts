import "server-only";
import type { CouponScope, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// VA-92: evaluación de cupones en el servidor, compartida por la validación del checkout (para
// mostrar el precio) y por la creación de la compra (que vuelve a calcular todo: el precio nunca
// viene del cliente).
// Un uso "reclamado" desde el perfil (CouponUsage sin compra) no cuenta para el límite: se consume
// al pagar (ver activatePurchase).

type Db = PrismaClient | Prisma.TransactionClient;

export type CouponEvaluation =
  | {
      ok: true;
      coupon: { id: string; code: string; scope: CouponScope };
      discountAmount: number;
      finalPrice: number;
    }
  | { ok: false; error: string };

const SCOPE_LABELS: Record<CouponScope, string> = {
  ALL: "cualquier compra",
  AIRCRAFT: "publicaciones de aeronaves",
  SPARE_PART: "publicaciones de repuestos",
  HANGAR: "publicaciones de hangares",
  AD_BANNER: "espacios publicitarios",
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

export async function evaluateCoupon(
  // Sin scope (reclamar un cupón desde el perfil) no se controla el alcance.
  input: { code: string; userId: string; scope?: CouponScope; price: number },
  db: Db = prisma
): Promise<CouponEvaluation> {
  const code = normalizeCouponCode(input.code);
  if (!code) return { ok: false, error: "Ingresá un código." };

  const coupon = await db.coupon.findUnique({ where: { code } });
  if (!coupon || !coupon.isActive) return { ok: false, error: "El cupón no existe o no está activo." };

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) return { ok: false, error: "Este cupón todavía no está vigente." };
  if (coupon.expiresAt && coupon.expiresAt < now) return { ok: false, error: "Este cupón venció." };
  if (input.scope && coupon.scope !== "ALL" && coupon.scope !== input.scope) {
    return { ok: false, error: `Este cupón es solo para ${SCOPE_LABELS[coupon.scope]}.` };
  }
  if (coupon.maxUses !== null && coupon.currentUses >= coupon.maxUses) {
    return { ok: false, error: "Este cupón ya alcanzó su límite de usos." };
  }
  const used = await db.couponUsage.count({
    where: { couponId: coupon.id, userId: input.userId, purchaseId: { not: null } },
  });
  if (used >= coupon.maxUsesPerUser) return { ok: false, error: "Ya usaste este cupón todas las veces permitidas." };

  const price = Math.max(0, input.price);
  const value = Number(coupon.discountValue);
  let discount = 0;
  if (coupon.discountType === "FULL_DISCOUNT" || coupon.type === "RENEWAL") discount = price;
  else if (coupon.discountType === "PERCENTAGE") discount = (price * Math.min(100, Math.max(0, value))) / 100;
  else if (coupon.discountType === "FIXED_AMOUNT") discount = Math.min(price, Math.max(0, value));

  const discountAmount = round2(discount);
  return {
    ok: true,
    coupon: { id: coupon.id, code: coupon.code, scope: coupon.scope },
    discountAmount,
    finalPrice: round2(Math.max(0, price - discountAmount)),
  };
}
