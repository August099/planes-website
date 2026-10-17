import "server-only";
import { prisma } from "@/lib/prisma";
import { LAUNCH_FREE_BALANCE, qualifiesForLaunchBalance } from "@/lib/promo";
import { BALANCE_FIELD } from "@/lib/balances";

// VA-89: datos para crear un usuario con el saldo de lanzamiento ya incluido (registro por email).
// VA-150: el saldo va también como lote LAUNCH (se consume antes que los packs y nunca se revierte).
export function launchBalanceCreateData(now = new Date()) {
  if (!qualifiesForLaunchBalance(now)) return {};
  return {
    aircraftListingsBalance: LAUNCH_FREE_BALANCE.aircraft,
    sparePartsListingsBalance: LAUNCH_FREE_BALANCE.spareParts,
    launchBalanceGrantedAt: now,
    creditLots: {
      create: [
        { kind: "AIRCRAFT" as const, source: "LAUNCH" as const, granted: LAUNCH_FREE_BALANCE.aircraft, remaining: LAUNCH_FREE_BALANCE.aircraft },
        { kind: "SPARE_PART" as const, source: "LAUNCH" as const, granted: LAUNCH_FREE_BALANCE.spareParts, remaining: LAUNCH_FREE_BALANCE.spareParts },
      ].filter((l) => l.granted > 0),
    },
  };
}

// VA-89: para cuentas que crea Auth.js (Google). Solo una vez por usuario y solo si la cuenta se
// creó antes del corte; deja al menos el saldo de lanzamiento sin pisar uno mayor.
export async function grantLaunchBalance(userId: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    // Fila bloqueada: dos logins a la vez no lo dan dos veces.
    const [user] = await tx.$queryRaw<{ aircraft: number; parts: number }[]>`
      SELECT "aircraftListingsBalance" AS aircraft, "sparePartsListingsBalance" AS parts FROM "User"
      WHERE "id" = ${userId} AND "launchBalanceGrantedAt" IS NULL AND "createdAt" < ${LAUNCH_FREE_BALANCE.until}
      FOR UPDATE`;
    if (!user) return false;
    const add = {
      AIRCRAFT: Math.max(0, LAUNCH_FREE_BALANCE.aircraft - user.aircraft),
      SPARE_PART: Math.max(0, LAUNCH_FREE_BALANCE.spareParts - user.parts),
    } as const;
    await tx.user.update({
      where: { id: userId },
      data: {
        launchBalanceGrantedAt: new Date(),
        [BALANCE_FIELD.AIRCRAFT]: { increment: add.AIRCRAFT },
        [BALANCE_FIELD.SPARE_PART]: { increment: add.SPARE_PART },
      },
    });
    for (const kind of ["AIRCRAFT", "SPARE_PART"] as const) {
      if (add[kind] > 0) await tx.creditLot.create({ data: { userId, kind, source: "LAUNCH", granted: add[kind], remaining: add[kind] } });
    }
    return true;
  });
}
