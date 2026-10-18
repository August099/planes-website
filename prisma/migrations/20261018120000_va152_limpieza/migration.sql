-- VA-152 · Limpieza del modelo por aviso (cupos fijos sin vencimiento).
-- 1) Datos: los avisos vencidos (por estado o por fecha) y "pendiente de pago" pasan a pausados, antes
--    de quitar esos estados y la fecha de vencimiento. Hangares (ocultos) no se tocan.
UPDATE "Aircraft" SET "status" = 'PAUSED'
  WHERE "status" IN ('EXPIRED', 'PENDING_PAYMENT') OR ("status" = 'ACTIVE' AND "listingExpiresAt" < now());
UPDATE "SparePart" SET "status" = 'PAUSED'
  WHERE "status" IN ('EXPIRED', 'PENDING_PAYMENT') OR ("status" = 'ACTIVE' AND "listingExpiresAt" < now());

-- 2) Esquema (generado con prisma migrate diff).
-- AlterEnum
BEGIN;
CREATE TYPE "SparePartStatus_new" AS ENUM ('ACTIVE', 'SOLD', 'PAUSED');
ALTER TABLE "public"."SparePart" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "SparePart" ALTER COLUMN "status" TYPE "SparePartStatus_new" USING ("status"::text::"SparePartStatus_new");
ALTER TYPE "SparePartStatus" RENAME TO "SparePartStatus_old";
ALTER TYPE "SparePartStatus_new" RENAME TO "SparePartStatus";
DROP TYPE "public"."SparePartStatus_old";
ALTER TABLE "SparePart" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- DropIndex
DROP INDEX "Aircraft_status_listingExpiresAt_createdAt_idx";

-- AlterTable
ALTER TABLE "Aircraft" DROP COLUMN "listingExpiresAt",
ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "BillingSettings" DROP COLUMN "renewalPercent";

-- AlterTable
ALTER TABLE "Plan" DROP COLUMN "featuredPerMonth",
DROP COLUMN "noExpiry";

-- AlterTable
ALTER TABLE "SparePart" DROP COLUMN "listingExpiresAt",
ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "featuredCredits";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "aircraftListingsBalance",
DROP COLUMN "launchBalanceGrantedAt",
DROP COLUMN "sparePartsListingsBalance";

-- DropTable
DROP TABLE "FeaturedPrice";

-- CreateIndex
CREATE INDEX "Aircraft_status_createdAt_idx" ON "Aircraft"("status", "createdAt");

