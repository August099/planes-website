import "server-only";
import { prisma } from "@/lib/prisma";
import { LAUNCH_FREE_BALANCE, qualifiesForLaunchBalance } from "@/lib/promo";

// VA-89: datos para crear un usuario con el saldo de lanzamiento ya incluido (registro por email).
export function launchBalanceCreateData(now = new Date()) {
  if (!qualifiesForLaunchBalance(now)) return {};
  return {
    aircraftListingsBalance: LAUNCH_FREE_BALANCE.aircraft,
    sparePartsListingsBalance: LAUNCH_FREE_BALANCE.spareParts,
    launchBalanceGrantedAt: now,
  };
}

// VA-89: para cuentas que crea Auth.js (Google). Solo una vez por usuario y solo si la cuenta se
// creó antes del corte; deja al menos el saldo de lanzamiento sin pisar uno mayor.
export async function grantLaunchBalance(userId: string): Promise<boolean> {
  const updated = await prisma.$executeRaw`
    UPDATE "User"
    SET "aircraftListingsBalance"   = GREATEST("aircraftListingsBalance", ${LAUNCH_FREE_BALANCE.aircraft}),
        "sparePartsListingsBalance" = GREATEST("sparePartsListingsBalance", ${LAUNCH_FREE_BALANCE.spareParts}),
        "launchBalanceGrantedAt"    = NOW()
    WHERE "id" = ${userId}
      AND "launchBalanceGrantedAt" IS NULL
      AND "createdAt" < ${LAUNCH_FREE_BALANCE.until}`;
  return updated > 0;
}
