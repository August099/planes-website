"server-only";
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface CreateCouponInput {
  code: string;
  type: "DISCOUNT" | "RENEWAL";
  discountType?: "FULL_DISCOUNT" | "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue?: number;
  scope: "ALL" | "AIRCRAFT" | "SPARE_PART" | "AD_BANNER";
  maxUses?: number | null;
  maxUsesPerUser: number;
  isActive: boolean;
  expiresAt?: string | null;
}

// Genera un código de 6 caracteres alfanumérico en mayúsculas
export async function generateRandomCouponCode(): Promise<string> {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  let isUnique = false;

  while (!isUnique) {
    code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const existing = await prisma.coupon.findUnique({ where: { code } });
    if (!existing) isUnique = true;
  }

  return code;
}

// Obtener todos los cupones sanitizados para Client Components
export async function getAdminCoupons() {
  try {
    const rawCoupons = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Sanitización de objetos Prisma (Decimal -> number, Date -> ISO string)
    const coupons = rawCoupons.map((coupon) => ({
      ...coupon,
      discountValue: Number(coupon.discountValue),
      startsAt: coupon.startsAt?.toISOString() ?? null,
      expiresAt: coupon.expiresAt?.toISOString() ?? null,
      createdAt: coupon.createdAt.toISOString(),
      updatedAt: coupon.updatedAt.toISOString(),
    }));

    return coupons;
  } catch (error) {
    console.error("Error al obtener cupones:", error);
    throw new Error("No se pudieron cargar los cupones.");
  }
}

// Crear un nuevo cupón
export async function createAdminCoupon(data: CreateCouponInput) {
  try {
    const formattedCode = data.code.trim().toUpperCase();

    // Validar formato de 6 caracteres
    if (formattedCode.length !== 6) {
      return { success: false, error: "El código debe tener exactamente 6 caracteres." };
    }

    // Verificar si ya existe
    const existing = await prisma.coupon.findUnique({
      where: { code: formattedCode },
    });

    if (existing) {
      return { success: false, error: "El código de cupón ya existe. Genera otro o cambia el nombre." };
    }

    await prisma.coupon.create({
      data: {
        code: formattedCode,
        type: data.type,
        discountType: data.type === "RENEWAL" ? "FULL_DISCOUNT" : data.discountType,
        discountValue: data.type === "RENEWAL" ? 0 : (data.discountValue || 0),
        scope: data.scope,
        maxUses: data.maxUses ?? null,
        currentUses: 0,
        maxUsesPerUser: data.maxUsesPerUser || 1,
        isActive: data.isActive,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    });

    revalidatePath("/admin/coupons");
    return { success: true };
  } catch (error: any) {
    console.error("Error al crear cupón:", error);
    return { success: false, error: error.message || "Error al crear el cupón." };
  }
}

// Cambiar el estado activo/inactivo de un cupón
export async function toggleCouponStatus(id: string, isActive: boolean) {
  try {
    await prisma.coupon.update({
      where: { id },
      data: { isActive },
    });
    revalidatePath("/admin/coupons");
    return { success: true };
  } catch (error) {
    console.error("Error al actualizar estado del cupón:", error);
    return { success: false, error: "No se pudo actualizar el estado." };
  }
}