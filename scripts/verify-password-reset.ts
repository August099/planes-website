// VA-105 · 3: verificación de "Olvidé mi contraseña" y del cierre de sesiones contra va_dev.
// Los mails van a delivered+…@resend.dev (casilla de prueba de Resend; delivered@resend.dev ya existe en va_dev). Para el cierre de sesiones
// hace falta el servidor de desarrollo en BASE_URL (por defecto http://localhost:3000).
// Crea los usuarios de prueba y los borra al final.
//
// Uso: npx tsx --require ./scripts/stub-server-only.cjs scripts/verify-password-reset.ts
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { encode } from "@auth/core/jwt";
import { prisma } from "@/lib/prisma";
import { isResetTokenValid, requestPasswordReset, resetPassword } from "@/lib/password-reset";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const EMAIL = "delivered+va105@resend.dev";
const GOOGLE_ONLY = "delivered+va105google@resend.dev";
const rows: { caso: string; esperado: string; obtenido: string; ok: boolean }[] = [];
const check = (caso: string, esperado: string, obtenido: string) => rows.push({ caso, esperado, obtenido, ok: esperado === obtenido });
const sha = (t: string) => createHash("sha256").update(t).digest("hex");

// El token en texto solo viaja en el mail: para probar, se crea uno con el mismo formato.
async function plantToken(userId: string, token: string, expiresAt = new Date(Date.now() + 3_600_000)) {
  await prisma.passwordResetToken.create({ data: { userId, tokenHash: sha(token), expiresAt } });
}
const clearLimits = () => prisma.rateLimitEvent.deleteMany({});

async function sessionFor(user: { id: string; email: string }, authAt: number) {
  const token = await encode({ token: { sub: user.id, id: user.id, email: user.email, authAt }, secret: process.env.AUTH_SECRET!, salt: "authjs.session-token" });
  const res = await fetch(`${BASE_URL}/api/auth/session`, { headers: { cookie: `authjs.session-token=${token}` } });
  const body = await res.json();
  return body?.user?.id === user.id ? "con sesión" : "sin sesión";
}

async function main() {
  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname !== "localhost" || url.pathname !== "/va_dev") throw new Error("Solo contra va_dev local.");
  const ids: string[] = [];
  try {
    await clearLimits();
    const user = await prisma.user.create({ data: { email: EMAIL, name: "Prueba contraseña", passwordHash: await bcrypt.hash("Vieja123!", 10) } });
    const google = await prisma.user.create({ data: { email: GOOGLE_ONLY, name: "Prueba Google", emailVerified: new Date() } });
    ids.push(user.id, google.id);

    // 1) Email que no existe: misma respuesta, sin token.
    check("1. Email no registrado", "sent · 0 tokens", `${await requestPasswordReset("nadie-va105@ventasaeronauticas.test", "10.0.0.1")} · ${await prisma.passwordResetToken.count({ where: { user: { email: "nadie-va105@ventasaeronauticas.test" } } })} tokens`);

    // 2) Pedido real: token guardado como hash, vence en 1 hora, mail a delivered@resend.dev.
    check("2. Pedido de una cuenta con contraseña (mail enviado)", "sent", await requestPasswordReset(` ${EMAIL.toUpperCase()} `, "10.0.0.2"));
    const t1 = await prisma.passwordResetToken.findFirstOrThrow({ where: { userId: user.id } });
    const minutes = Math.round((t1.expiresAt.getTime() - t1.createdAt.getTime()) / 60_000);
    check("2b. Se guarda solo el hash y vence en 60 min", "64 caracteres hex · 60 min", `${/^[0-9a-f]{64}$/.test(t1.tokenHash) ? "64 caracteres hex" : t1.tokenHash} · ${minutes} min`);

    // 3) Límites.
    check("3a. Segundo pedido en el mismo minuto", "rate-limited", await requestPasswordReset(EMAIL, "10.0.0.3"));
    await clearLimits();
    for (let i = 0; i < 5; i++) await prisma.rateLimitEvent.create({ data: { key: `pwreset-ip:${sha("10.9.9.9")}` } });
    check("3b. Más de 5 pedidos por minuto desde la misma IP", "rate-limited", await requestPasswordReset("otro-va105@ventasaeronauticas.test", "10.9.9.9"));
    await clearLimits();
    for (let i = 0; i < 5; i++) await prisma.rateLimitEvent.create({ data: { key: `pwreset-email:${sha(EMAIL)}`, createdAt: new Date(Date.now() - 10 * 60_000) } });
    check("3c. 6.º pedido del mismo email en una hora", "rate-limited", await requestPasswordReset(EMAIL, "10.0.0.4"));
    await clearLimits();

    // 4) Pedir otro invalida los anteriores.
    await plantToken(user.id, "token-viejo-va105");
    await requestPasswordReset(EMAIL, "10.0.0.5");
    check("4. Pedir uno nuevo invalida el anterior", "false", String(await isResetTokenValid("token-viejo-va105")));
    await clearLimits();

    // 5) Restablecer.
    await plantToken(user.id, "token-bueno-va105");
    check("5a. Contraseña débil", "weak", await resetPassword("token-bueno-va105", "corta"));
    check("5b. Token inexistente", "invalid", await resetPassword("no-existe", "Nueva123!"));
    await plantToken(user.id, "token-vencido-va105", new Date(Date.now() - 1000));
    check("5c. Token vencido", "invalid", await resetPassword("token-vencido-va105", "Nueva123!"));
    await prisma.user.update({ where: { id: user.id }, data: { emailVerified: null } });
    const [r1, r2] = await Promise.all([resetPassword("token-bueno-va105", "Nueva123!"), resetPassword("token-bueno-va105", "Otra456!")]);
    check("5d. Dos envíos a la vez del mismo link", "ok · invalid", [r1, r2].sort().reverse().join(" · "));
    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    check("5e. La contraseña nueva funciona", "true", String((await bcrypt.compare("Nueva123!", after.passwordHash!)) || (await bcrypt.compare("Otra456!", after.passwordHash!))));
    check("5f. El email queda verificado y se registra el cambio", "verificado · con passwordChangedAt", `${after.emailVerified ? "verificado" : "sin verificar"} · ${after.passwordChangedAt ? "con passwordChangedAt" : "sin fecha"}`);
    check("5g. El link ya no sirve", "invalid", await resetPassword("token-bueno-va105", "Tercera789!"));

    // 6) Cuenta solo de Google: recibe el mail que le dice que entre con Google (y puede crear una).
    check("6. Cuenta solo de Google (mail enviado)", "sent · 1 token", `${await requestPasswordReset(GOOGLE_ONLY, "10.0.0.6")} · ${await prisma.passwordResetToken.count({ where: { userId: google.id } })} token`);

    // 7) Cierre de sesiones (servidor de desarrollo).
    const changedAt = after.passwordChangedAt!.getTime();
    check("7a. Sesión iniciada antes del cambio", "sin sesión", await sessionFor(after, changedAt - 60_000));
    check("7b. Sesión iniciada después del cambio", "con sesión", await sessionFor(after, changedAt + 1_000));
    check("7c. Cuenta sin cambios de contraseña", "con sesión", await sessionFor(google, Date.now() - 86_400_000));
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await clearLimits();
    await prisma.$disconnect();
  }
  console.table(rows.map((r) => ({ ...r, ok: r.ok ? "✔" : "✘" })));
  if (rows.some((r) => !r.ok)) process.exitCode = 1;
}
main();
