import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

// VA-105 · 3: límite de pedidos guardado en la base (RateLimitEvent), así funciona igual en todas
// las instancias de Vercel. La clave se guarda como hash: no queda el email ni la IP en texto.

export type Limit = { max: number; windowMs: number };

export const limitKey = (scope: string, value: string) => `${scope}:${createHash("sha256").update(value.trim().toLowerCase()).digest("hex")}`;

/** true si se puede seguir (y registra el pedido); false si alguna de las claves superó su límite. */
export async function hitRateLimit(rules: { key: string; limits: Limit[] }[]): Promise<boolean> {
  const now = Date.now();
  for (const { key, limits } of rules) {
    for (const { max, windowMs } of limits) {
      const count = await prisma.rateLimitEvent.count({ where: { key, createdAt: { gt: new Date(now - windowMs) } } });
      if (count >= max) return false;
    }
  }
  await prisma.rateLimitEvent.createMany({ data: rules.map(({ key }) => ({ key })) });
  return true;
}

/** Limpieza (cron diario): los límites miran como mucho una hora atrás. */
export function purgeRateLimitEvents() {
  return prisma.rateLimitEvent.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 24 * 3_600_000) } } });
}
