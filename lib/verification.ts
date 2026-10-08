import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/mail";

// Verificación de email del registro con contraseña (VA-20).
// Usa la tabla VerificationToken: identifier = email, token aleatorio, vence en 24 h.

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

/** Crea un token nuevo (borra los anteriores de ese email) y manda el mail. */
export async function issueVerificationEmail(email: string) {
  const identifier = email.toLowerCase().trim();
  const token = randomBytes(32).toString("hex");
  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier } }),
    prisma.verificationToken.create({
      data: { identifier, token, expires: new Date(Date.now() + TOKEN_TTL_MS) },
    }),
  ]);
  await sendVerificationEmail(identifier, token);
}

/** true si ya se mandó un mail a ese email hace menos de un minuto (anti-spam). */
export async function sentRecently(email: string) {
  const last = await prisma.verificationToken.findFirst({
    where: { identifier: email.toLowerCase().trim() },
    orderBy: { expires: "desc" },
    select: { expires: true },
  });
  if (!last) return false;
  const createdAt = last.expires.getTime() - TOKEN_TTL_MS;
  return Date.now() - createdAt < RESEND_COOLDOWN_MS;
}

export type VerifyResult = "ok" | "invalid" | "expired";

/** Valida el token, marca el email como verificado y borra el token. */
export async function consumeVerificationToken(token: string): Promise<VerifyResult> {
  if (!/^[a-f0-9]{64}$/.test(token)) return "invalid";

  const record = await prisma.verificationToken.findUnique({ where: { token } });
  if (!record) return "invalid";

  if (record.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token } }).catch(() => {});
    return "expired";
  }

  const updated = await prisma.user.updateMany({
    where: { email: record.identifier },
    data: { emailVerified: new Date() },
  });
  await prisma.verificationToken.deleteMany({ where: { identifier: record.identifier } });
  return updated.count > 0 ? "ok" : "invalid";
}
