import "server-only";
import { prisma } from "@/lib/prisma";
import type { getQuotaUsage } from "@/lib/quota";

// Datos del dueño de la cuenta que usan "Mi cuenta" (perfil) y "Ajustes" (VA-175).

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
