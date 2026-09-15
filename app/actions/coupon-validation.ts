"server-only";
"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";

export interface ValidateCouponParams {
  code: string;
  scope?: "AIRCRAFT" | "SPARE_PART" | "AD_BANNER";
  originalPrice?: number;
}

// 1. Validar un cupón sin registrar uso (para simular el precio en el checkout)
export async function validateCoupon({ code, scope, originalPrice = 0 }: ValidateCouponParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Debes iniciar sesión para usar un cupón." };
    }

    const cleanCode = code.trim().toUpperCase();

    const coupon = await prisma.coupon.findUnique({
      where: { code: cleanCode },
    });

    if (!coupon || !coupon.isActive) {
      return { success: false, error: "El cupón ingresado no existe o no está activo." };
    }

    // Validar vigencia de fechas
    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now) {
      return { success: false, error: "Este cupón aún no está vigente." };
    }
    if (coupon.expiresAt && coupon.expiresAt < now) {
      return { success: false, error: "Este cupón ha expirado." };
    }

    // Validar scope (alcance)
    if (coupon.scope !== "ALL" && scope && coupon.scope !== scope) {
      return { success: false, error: `Este cupón solo es válido para publicaciones de ${coupon.scope}.` };
    }

    // Validar usos globales acumulados
    if (coupon.maxUses !== null && coupon.currentUses >= coupon.maxUses) {
      return { success: false, error: "Este cupón ha alcanzado su límite máximo de usos globales." };
    }

    // Validar usos del usuario actual
    const userUsagesCount = await prisma.couponUsage.count({
      where: {
        couponId: coupon.id,
        userId: user.id,
      },
    });

    if (userUsagesCount >= coupon.maxUsesPerUser) {
      return { success: false, error: "Ya has alcanzado el límite de usos permitidos para este cupón." };
    }

    // Calcular monto final de descuento
    let discountAmount = 0;
    const numericValue = Number(coupon.discountValue);

    if (coupon.discountType === "FULL_DISCOUNT" || coupon.type === "RENEWAL") {
      discountAmount = originalPrice;
    } else if (coupon.discountType === "PERCENTAGE") {
      discountAmount = (originalPrice * numericValue) / 100;
    } else if (coupon.discountType === "FIXED_AMOUNT") {
      discountAmount = Math.min(originalPrice, numericValue);
    }

    const finalPrice = Math.max(0, originalPrice - discountAmount);

    return {
      success: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        discountType: coupon.discountType,
        discountValue: numericValue,
        scope: coupon.scope,
      },
      discountAmount,
      finalPrice,
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
      return { success: false, error: "Debes iniciar sesión para guardar un cupón." };
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
      return { success: false, error: "Ya tienes este cupón guardado o utilizado en tu cuenta." };
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
  } catch (error: any) {
    console.error("Error al guardar cupón:", error);
    return { success: false, error: "No se pudo guardar el cupón." };
  }
}