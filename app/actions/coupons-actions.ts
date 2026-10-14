"use server";

import "server-only";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth-helpers";
import { errorMessage } from "@/lib/errors";

async function verifyAdmin() {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    throw new Error("UNAUTHORIZED");
  }
}

export interface CreateCouponInput {
  code: string;
  type: "DISCOUNT" | "RENEWAL";
  discountType?: "FULL_DISCOUNT" | "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue?: number;
  scope: "ALL" | "AIRCRAFT" | "SPARE_PART" | "AD_BANNER" | "FEATURED";
  maxUses?: number | null;
  maxUsesPerUser: number;
  isActive: boolean;
  // VA-105: "AAAA-MM-DDTHH:mm" en hora argentina (input datetime-local del admin).
  startsAt?: string | null;
  expiresAt?: string | null;
}

// Genera un código de 6 caracteres alfanumérico en mayúsculas
export async function generateRandomCouponCode(): Promise<string> {
  await verifyAdmin();

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
  await verifyAdmin();

  try {
    const rawCoupons = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
      // VA-105 · 2.9: quién usó cada cupón (solo usos con compra; los "guardados" no cuentan).
      include: {
        usages: {
          where: { purchaseId: { not: null } },
          orderBy: { usedAt: "desc" },
          select: { usedAt: true, User: { select: { id: true, name: true, email: true } }, Purchase: { select: { description: true, finalPrice: true } } },
        },
      },
    });

    // Sanitización de objetos Prisma (Decimal -> number, Date -> ISO string)
    const coupons = rawCoupons.map(({ usages, ...coupon }) => ({
      ...coupon,
      usages: usages.map((u) => ({
        usedAt: u.usedAt.toISOString(),
        user: u.User,
        description: u.Purchase?.description ?? "",
        finalPrice: Number(u.Purchase?.finalPrice ?? 0),
      })),
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
    await verifyAdmin();

    const formattedCode = data.code.trim().toUpperCase();

    // VA-105: de 4 a 20 caracteres (letras, números y guiones), así entran códigos como LANZAMIENTO.
    if (!/^[A-Z0-9-]{4,20}$/.test(formattedCode)) {
      return { success: false, error: "El código tiene que tener de 4 a 20 caracteres: letras, números o guiones." };
    }
    const value = Number(data.discountValue || 0);
    if (data.type !== "RENEWAL" && data.discountType === "PERCENTAGE" && (value <= 0 || value > 100)) {
      return { success: false, error: "El porcentaje tiene que estar entre 1 y 100." };
    }
    if (data.type !== "RENEWAL" && data.discountType === "FIXED_AMOUNT" && value <= 0) {
      return { success: false, error: "El monto fijo tiene que ser mayor a 0." };
    }
    const startsAt = parseArDateTime(data.startsAt);
    const expiresAt = parseArDateTime(data.expiresAt);
    if (startsAt === undefined || expiresAt === undefined) return { success: false, error: "Revisá las fechas." };
    if (startsAt && expiresAt && expiresAt <= startsAt) return { success: false, error: "El vencimiento tiene que ser posterior al inicio." };

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
        startsAt,
        expiresAt,
      },
    });

    revalidatePath("/admin/coupons");
    return { success: true };
  } catch (error) {
    if (errorMessage(error) === "UNAUTHORIZED") {
      return { success: false, error: "No autorizado." };
    }
    console.error("Error al crear cupón:", error);
    return { success: false, error: errorMessage(error) || "Error al crear el cupón." };
  }
}

// Cambiar el estado activo/inactivo de un cupón
export async function toggleCouponStatus(id: string, isActive: boolean) {
  try {
    await verifyAdmin();

    await prisma.coupon.update({
      where: { id },
      data: { isActive },
    });
    revalidatePath("/admin/coupons");
    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return { success: false, error: "No autorizado." };
    }
    console.error("Error al actualizar estado del cupón:", error);
    return { success: false, error: "No se pudo actualizar el estado." };
  }
}

/** "AAAA-MM-DDTHH:mm" (hora argentina) → Date; null si está vacío; undefined si es inválido. */
function parseArDateTime(value: string | null | undefined): Date | null | undefined {
  if (!value) return null;
  if (!/^d{4}-d{2}-d{2}Td{2}:d{2}$/.test(value)) return undefined;
  const d = new Date(`${value}:00-03:00`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}
