-- AlterTable
ALTER TABLE "User" ADD COLUMN     "launchBalanceGrantedAt" TIMESTAMP(3);

-- VA-89: saldo de lanzamiento para las cuentas que ya existen (creadas hasta el 2/12/2026
-- 23:59:59 hora Argentina = 2026-12-03 03:00 UTC). Deja al menos 1 aviso de avión y 1 de
-- repuesto (no pisa saldos mayores) y marca cuándo se dio, para no darlo dos veces.
UPDATE "User"
SET "aircraftListingsBalance"   = GREATEST("aircraftListingsBalance", 1),
    "sparePartsListingsBalance" = GREATEST("sparePartsListingsBalance", 1),
    "launchBalanceGrantedAt"    = CURRENT_TIMESTAMP
WHERE "launchBalanceGrantedAt" IS NULL
  AND "createdAt" < TIMESTAMP '2026-12-03 03:00:00';
