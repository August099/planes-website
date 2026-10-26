"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { billingSchema, billingSnapshot } from "@/lib/billing-rules";

// VA-92 (pedido del socio, 13/10): datos de facturación guardados en el perfil, así el checkout los
// usa directo (solo muestra el resumen). Mismas reglas que el checkout; el DNI de consumidor final
// es opcional acá (el checkout lo pide solo si el monto llega al umbral de ARCA).
export async function saveBillingProfileAction(input: unknown): Promise<{ ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> }> {
  const user = await getCurrentUser();
  if (!user?.id) return { ok: false, error: "Tenés que iniciar sesión." };
  const parsed = billingSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0] ?? "form")] ??= i.message;
    return { ok: false, error: "Revisá los campos marcados.", fieldErrors };
  }
  const s = billingSnapshot(parsed.data);
  const data = { kind: parsed.data.kind, name: s.name, docType: s.docType, docNumber: s.docNumber, ivaCondition: s.ivaCondition, email: s.email, address: s.address };
  await prisma.billingProfile.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data });
  revalidatePath(`/profile/${user.id}`);
  return { ok: true };
}
