"use server";

import "server-only";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth-helpers";
import { FOUNDING_MEMBER_LIMIT } from "@/lib/constants";
import { parseAnyUserType } from "@/lib/user-types";

// Miembro fundador asignado a mano por un admin (VA-58). Antes se marcaba solo en el
// registro si había menos de 50 usuarios, y las cuentas de prueba ocupaban lugares.
export async function setFoundingMemberAction(
  userId: string,
  value: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await getCurrentUser();
  if (!admin?.isAdmin) return { ok: false, error: "No autorizado." };
  if (typeof userId !== "string" || !userId) return { ok: false, error: "Usuario inválido." };

  try {
    if (value) {
      const count = await prisma.user.count({ where: { isFoundingMember: true, id: { not: userId } } });
      if (count >= FOUNDING_MEMBER_LIMIT) {
        return { ok: false, error: `Ya hay ${FOUNDING_MEMBER_LIMIT} miembros fundadores. Quitá uno antes de sumar otro.` };
      }
    }

    await prisma.user.update({ where: { id: userId }, data: { isFoundingMember: value } });
    revalidatePath("/admin/users");
    revalidatePath(`/profile/${userId}`);
    return { ok: true };
  } catch (error) {
    console.error("Error al cambiar miembro fundador:", error);
    return { ok: false, error: "No se pudo guardar el cambio." };
  }
}

// VA-33: el admin corrige el tipo de cuenta (incluida "Fábrica", que el usuario no puede elegir).
export async function setUserTypeAction(
  userId: string,
  value: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await getCurrentUser();
  if (!admin?.isAdmin) return { ok: false, error: "No autorizado." };
  if (typeof userId !== "string" || !userId) return { ok: false, error: "Usuario inválido." };
  const userType = parseAnyUserType(value);
  if (!userType) return { ok: false, error: "Tipo de cuenta inválido." };

  try {
    await prisma.user.update({ where: { id: userId }, data: { userType, userTypeConfirmed: true } });
    revalidatePath("/admin/users");
    revalidatePath(`/profile/${userId}`);
    return { ok: true };
  } catch (error) {
    console.error("Error al cambiar el tipo de cuenta:", error);
    return { ok: false, error: "No se pudo guardar el cambio." };
  }
}
