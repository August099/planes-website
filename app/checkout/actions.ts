"use server";

import { getCurrentUser } from "@/lib/auth-helpers";
import { evaluateCoupon } from "@/lib/coupons";
import { PaymentsConfigError } from "@/lib/mercadopago";
import { productQueryFromKey, resolveProduct, startCheckout, type CheckoutResult } from "@/lib/payments/checkout";

// VA-92: acciones del checkout. El precio, el cupón y los datos de facturación se validan siempre
// acá (el cliente solo muestra).

export type CouponCheck =
  | { ok: true; code: string; discountAmount: number; finalPrice: number }
  | { ok: false; error: string };

export async function checkCouponAction(productKey: string, code: string): Promise<CouponCheck> {
  const user = await getCurrentUser();
  if (!user?.id) return { ok: false, error: "Tenés que iniciar sesión." };
  const product = await resolveProduct(user.id, productQueryFromKey(productKey));
  if ("error" in product) return { ok: false, error: product.error };
  const result = await evaluateCoupon({ code, userId: user.id, scope: product.scope, price: product.price });
  if (!result.ok) return result;
  return { ok: true, code: result.coupon.code, discountAmount: result.discountAmount, finalPrice: result.finalPrice };
}

export async function startCheckoutAction(input: {
  productKey: string;
  couponCode?: string;
  billing: unknown;
  payerEmail?: string;
}): Promise<CheckoutResult> {
  const user = await getCurrentUser();
  if (!user?.id) return { ok: false, error: "Tenés que iniciar sesión." };
  try {
    return await startCheckout({
      userId: user.id,
      userEmail: user.email ?? null,
      productKey: String(input.productKey ?? ""),
      couponCode: typeof input.couponCode === "string" ? input.couponCode : undefined,
      billing: input.billing,
      payerEmail: typeof input.payerEmail === "string" ? input.payerEmail : undefined,
    });
  } catch (error) {
    console.error("[checkout] no se pudo iniciar el pago:", error);
    if (error instanceof PaymentsConfigError) return { ok: false, error: "El pago online no está configurado. Escribinos y lo resolvemos." };
    // Mercado Pago rechaza el alta de una suscripción si el email no es de una cuenta válida.
    const mp = error as { status?: number; message?: string };
    if (mp?.status === 400 && /payer|email/i.test(mp.message ?? "")) {
      return { ok: false, error: "Mercado Pago no aceptó ese email: tiene que ser el de tu cuenta de Mercado Pago.", fieldErrors: { payerEmail: "Revisá este email." } };
    }
    return { ok: false, error: "No pudimos conectar con Mercado Pago. Probá de nuevo en unos minutos." };
  }
}
