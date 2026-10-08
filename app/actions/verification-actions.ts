"use server";

import { prisma } from "@/lib/prisma";
import { issueVerificationEmail, sentRecently } from "@/lib/verification";

/**
 * "Reenviar mail de verificación" del login (VA-20). Responde siempre lo mismo, exista
 * o no la cuenta, para no revelar qué emails están registrados. Máximo un envío por minuto.
 */
export async function resendVerificationEmailAction(email: string) {
  const normalized = String(email ?? "").toLowerCase().trim();
  const generic = { ok: true as const, message: "Si hay una cuenta pendiente de activar con ese email, te reenviamos el link." };

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || normalized.length > 254) {
    return { ok: false as const, message: "Ingresá un email válido." };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: normalized },
      select: { passwordHash: true, emailVerified: true },
    });
    // Solo cuentas con contraseña que todavía no activaron su email.
    if (!user?.passwordHash || user.emailVerified) return generic;

    if (await sentRecently(normalized)) {
      return { ok: false as const, message: "Ya te enviamos un mail hace un momento. Esperá un minuto y probá de nuevo." };
    }

    await issueVerificationEmail(normalized);
    return generic;
  } catch (error) {
    console.error("Error al reenviar el mail de verificación:", error);
    return { ok: false as const, message: "No pudimos enviar el mail. Probá de nuevo en unos minutos." };
  }
}
