-- VA-171: métricas por plan. Eventos del comparador y de clics desde la Página VA, y la provincia
-- aproximada del visitante (sin la IP).
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.
ALTER TYPE "AnalyticsEventType" ADD VALUE 'COMPARE_ADD';
ALTER TYPE "AnalyticsEventType" ADD VALUE 'PROFILE_LISTING_CLICK';
-- AlterTable
ALTER TABLE "AnalyticsEvent" ADD COLUMN     "region" VARCHAR(8);
