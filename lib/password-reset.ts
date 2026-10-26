import "server-only";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { appBaseUrl, sendPasswordResetEmail } from "@/lib/mail";
import { hitRateLimit, limitKey } from "@/lib/rate-limit";
import { PASSWORD_REGEX } from "@/lib/password-rules";

// VA-105 · 3: "Olvidé mi contraseña" y cierre de sesiones al cambiarla.
// - Token aleatorio de 32 bytes; en la base solo su SHA-256. Vence en 1 hora, un solo uso, y pedir
//   uno nuevo invalida los anteriores.
// - Límites: por email 1 por minuto y 5 por hora; por IP 5 por minuto y 20 por hora.
// - La respuesta es siempre la misma exista o no la cuenta (no revela qué emails están registrados).

const TOKEN_TTL_MS = 60 * 60 * 1000;
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export type RequestResult = "sent" | "rate-limited";

export async function requestPasswordReset(emailInput: string, ip: string | null): Promise<RequestResult> {
  const email = emailInput.trim().toLowerCase();
  const allowed = await hitRateLimit([
    { key: limitKey("pwreset-email", email), limits: [{ max: 1, windowMs: MINUTE }, { max: 5, windowMs: HOUR }] },
    ...(ip ? [{ key: limitKey("pwreset-ip", ip), limits: [{ max: 5, windowMs: MINUTE }, { max: 20, windowMs: HOUR }] }] : []),
  ]);
  if (!allowed) return "rate-limited";

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, passwordHash: true } });
  if (!user) return "sent";

  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: now } }),
    prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(now.getTime() + TOKEN_TTL_MS) } }),
  ]);
  await sendPasswordResetEmail({ to: email, link: `${appBaseUrl()}/reset-password?token=${token}`, hasPassword: Boolean(user.passwordHash) });
  return "sent";
}

/** Para mostrar el formulario solo si el link sirve. */
export async function isResetTokenValid(token: string) {
  if (!token) return false;
  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) }, select: { usedAt: true, expiresAt: true } });
  return Boolean(row && !row.usedAt && row.expiresAt > new Date());
}

export type ResetResult = "ok" | "invalid" | "weak";

export async function resetPassword(token: string, newPassword: string): Promise<ResetResult> {
  if (!PASSWORD_REGEX.test(newPassword)) return "weak";
  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: { select: { emailVerified: true } } } });
  if (!row || row.usedAt || row.expiresAt <= new Date()) return "invalid";

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    // Marca el token como usado solo si nadie lo usó antes (dos envíos a la vez: gana uno).
    const claimed = await tx.passwordResetToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: now } });
    if (claimed.count === 0) return "invalid" as const;
    await tx.user.update({
      where: { id: row.userId },
      // El link llegó a la casilla: prueba que el email es suyo.
      data: { passwordHash, passwordChangedAt: now, ...(row.user.emailVerified ? {} : { emailVerified: now }) },
    });
    return "ok" as const;
  });
}
