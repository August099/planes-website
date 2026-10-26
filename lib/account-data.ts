import "server-only";
import { prisma } from "@/lib/prisma";
import type { getQuotaUsage } from "@/lib/quota";
import { getMissingProfileFields, type ProfileField } from "@/lib/profile";

// Datos del dueño de la cuenta que usan "Mi cuenta" (perfil) y "Ajustes" (VA-175).

// Sin caché a propósito (VA-179): el cartel de datos faltantes se apaga apenas se completa el dato, venga de
// Ajustes, del link de verificación, del restablecimiento de contraseña o del login con Google.
export async function missingProfileFields(userId: string): Promise<ProfileField[]> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { phone: true, city: true, province: true, emailVerified: true, passwordHash: true },
  });
  return u ? getMissingProfileFields(u) : [];
}

// VA-92: datos de facturación del dueño (o los del perfil, para precargar si todavía no guardó nada).
export async function ownerBillingProfile(userId: string, name: string | null, email: string | null) {
  const p = await prisma.billingProfile.findUnique({ where: { userId } });
  if (!p) {
    return { saved: false, values: { kind: "CONSUMIDOR_FINAL" as const, name: name ?? "", docNumber: "", ivaCondition: "" as const, address: "", email: email ?? "" } };
  }
  return {
    saved: true,
    values: {
      kind: p.kind,
      name: p.name,
      docNumber: p.docNumber ?? "",
      ivaCondition: (["RI", "M", "E"].includes(p.ivaCondition) ? p.ivaCondition : "") as "RI" | "M" | "E" | "",
      address: p.address ?? "",
      email: p.email,
    },
  };
}

// VA-152: uso del cupo para "Mis publicaciones" y el plan.
export function quotaForView(u: Awaited<ReturnType<typeof getQuotaUsage>>) {
  return {
    planName: u.planName,
    aircraft: { used: u.used.AIRCRAFT, limit: u.limits.AIRCRAFT },
    parts: { used: u.used.SPARE_PART, limit: u.limits.SPARE_PART },
  };
}
