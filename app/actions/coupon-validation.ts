"server-only";
"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { evaluateCoupon } from "@/lib/coupons";

export interface ValidateCouponParams {
  code: string;
  scope?: "AIRCRAFT" | "SPARE_PART" | "HANGAR" | "AD_BANNER";
  originalPrice?: number;
}

// 1. Validar un cupón sin registrar uso. VA-92: misma lógica que el checkout (lib/coupons.ts);
// un cupón reclamado desde el perfil ya no cuenta como usado hasta que se paga con él.
export async function validateCoupon({ code, scope, originalPrice = 0 }: ValidateCouponParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Tenés que iniciar sesión para usar un cupón." };
    }
    const result = await evaluateCoupon({ code, userId: user.id, scope, price: originalPrice });
    if (!result.ok) return { success: false, error: result.error };
    const coupon = await prisma.coupon.findUniqueOrThrow({ where: { id: result.coupon.id } });
    return {
      success: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
        scope: coupon.scope,
      },
      discountAmount: result.discountAmount,
      finalPrice: result.finalPrice,
    };
  } catch (error) {
    console.error("Error al validar cupón:", error);
    return { success: false, error: "Ocurrió un error al verificar el cupón." };
  }
}

// 2. Guardar o Vincular un cupón en el perfil del usuario (Claim)
export async function claimCouponToProfile(code: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Tenés que iniciar sesión para guardar un cupón." };
    }

    const validation = await validateCoupon({ code });
    if (!validation.success || !validation.coupon) {
      return { success: false, error: validation.error };
    }

    // Verificar si el usuario ya registró este cupón en sus usages
    const existingUsage = await prisma.couponUsage.findFirst({
      where: {
        couponId: validation.coupon.id,
        userId: user.id,
      },
    });

    if (existingUsage) {
      return { success: false, error: "Ya tenés este cupón guardado o usado en tu cuenta." };
    }

    // Registrar intención/reserva en CouponUsage
    await prisma.couponUsage.create({
      data: {
        couponId: validation.coupon.id,
        userId: user.id,
      },
    });

    revalidatePath(`/profile/${user.id}`);
    return { success: true, message: "¡Cupón guardado con éxito en tu perfil!" };
  } catch (error) {
    console.error("Error al guardar cupón:", error);
    return { success: false, error: "No se pudo guardar el cupón." };
  }
}