"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { issueVerificationEmail, sentRecently } from "@/lib/verification";

// 27/10: acciones de /onboarding/completar (cuentas de Google o Facebook, o cualquiera sin términos o sin
// email verificado). Siempre sobre la cuenta de la sesión, nunca un email que llegue del formulario.

export async function acceptTermsAction(accepted: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user?.id) return { ok: false, error: "Tu sesión venció. Volvé a ingresar." };
  if (!accepted) return { ok: false, error: "Para usar Ventas Aeronáuticas tenés que aceptar los términos." };
  await prisma.user.updateMany({ where: { id: user.id, termsAcceptedAt: null }, data: { termsAcceptedAt: new Date() } });
  return { ok: true };
}

export async function sendMyVerificationEmailAction(): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user?.id) return { ok: false, error: "Tu sesión venció. Volvé a ingresar." };
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { email: true, emailVerified: true } });
  if (!dbUser) return { ok: false, error: "No encontramos tu cuenta." };
  if (dbUser.emailVerified) return { ok: true };
  if (await sentRecently(dbUser.email)) return { ok: false, error: "Ya te mandamos un mail hace menos de un minuto. Revisá también en spam." };
  try {
    await issueVerificationEmail(dbUser.email);
    return { ok: true };
  } catch (err) {
    console.error("Error al mandar el mail de verificación (onboarding):", err);
    return { ok: false, error: "No pudimos mandar el mail. Probá de nuevo en un rato." };
  }
}

/** Estado actual, leído de la base (la sesión puede estar desactualizada hasta 5 minutos). */
export async function myAccountStatusAction(): Promise<{ termsAccepted: boolean; emailVerified: boolean } | null> {
  const user = await getCurrentUser();
  if (!user?.id) return null;
  const u = await prisma.user.findUnique({ where: { id: user.id }, select: { termsAcceptedAt: true, emailVerified: true } });
  return u ? { termsAccepted: !!u.termsAcceptedAt, emailVerified: !!u.emailVerified } : null;
}
