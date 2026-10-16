-- CreateEnum
CREATE TYPE "SubscriptionSource" AS ENUM ('MERCADOPAGO', 'MANUAL');

-- AlterEnum
ALTER TYPE "CouponScope" ADD VALUE 'FEATURED';

-- AlterTable
ALTER TABLE "Aircraft" ADD COLUMN     "featuredUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Hangar" ADD COLUMN     "featuredUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "featuredPerMonth" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN     "featuredDays" INTEGER,
ADD COLUMN     "featuredKind" "ListingKind",
ADD COLUMN     "featuredListingId" TEXT;

-- AlterTable
ALTER TABLE "SparePart" ADD COLUMN     "featuredUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "featuredCredits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "grantedById" TEXT,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "source" "SubscriptionSource" NOT NULL DEFAULT 'MERCADOPAGO';

-- CreateTable
CREATE TABLE "FeaturedPrice" (
    "id" TEXT NOT NULL,
    "days" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeaturedPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeaturedPrice_days_key" ON "FeaturedPrice"("days");

-- CreateIndex
CREATE INDEX "Aircraft_featuredUntil_idx" ON "Aircraft"("featuredUntil");

-- CreateIndex
CREATE INDEX "Hangar_featuredUntil_idx" ON "Hangar"("featuredUntil");

-- CreateIndex
CREATE INDEX "SparePart_featuredUntil_idx" ON "SparePart"("featuredUntil");

