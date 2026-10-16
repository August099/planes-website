import { createHmac, timingSafeEqual } from "node:crypto";

// VA-105 · 3: cierre de sesiones al cambiar la contraseña.
// El callback jwt guarda cuándo se inició cada sesión (authAt) y la corta si passwordChangedAt es
// posterior. El dispositivo que cambió la contraseña recibe esta prueba firmada con AUTH_SECRET y
// la presenta con update(): así renueva su sesión, y una sesión robada no puede hacerlo.

export function passwordChangeProof(userId: string, changedAt: Date) {
  return createHmac("sha256", process.env.AUTH_SECRET ?? "").update(`${userId}:${changedAt.getTime()}`).digest("base64url");
}

export function isValidPasswordChangeProof(proof: unknown, userId: string, changedAt: Date | null) {
  if (typeof proof !== "string" || !changedAt) return false;
  const expected = Buffer.from(passwordChangeProof(userId, changedAt));
  const given = Buffer.from(proof);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
