-- CreateEnum
CREATE TYPE "HangarRentalType" AS ENUM ('SHARED_SPACE', 'WHOLE_HANGAR');

-- CreateEnum
CREATE TYPE "HangarSpaceType" AS ENUM ('INDIVIDUAL', 'SHARED', 'PLATFORM');

-- CreateEnum
CREATE TYPE "HangarRentPeriod" AS ENUM ('NIGHT', 'DAY', 'MONTH', 'YEAR');

-- CreateEnum
CREATE TYPE "HangarAircraftType" AS ENUM ('SINGLE_ENGINE', 'TWIN_ENGINE', 'HELICOPTER', 'LIGHT_JET', 'GLIDER', 'ULTRALIGHT');

-- CreateEnum
CREATE TYPE "HangarService" AS ENUM ('ELECTRICITY', 'WATER', 'BATHROOM', 'OFFICE_STORAGE', 'SECURITY', 'ACCESS_24H', 'FUEL', 'WORKSHOP', 'FLIGHT_SCHOOL', 'LIGHTED_RUNWAY');

-- CreateEnum
CREATE TYPE "ListingCurrency" AS ENUM ('ARS', 'USD');

-- AlterEnum
ALTER TYPE "CouponScope" ADD VALUE 'HANGAR';

-- AlterEnum
ALTER TYPE "ListingKind" ADD VALUE 'HANGAR';

-- AlterEnum
ALTER TYPE "PlanType" ADD VALUE 'HANGAR_PACK';

-- AlterTable
ALTER TABLE "AnalyticsEvent" ADD COLUMN     "hangarId" TEXT;

-- AlterTable
ALTER TABLE "Favorite" ADD COLUMN     "hangarId" TEXT;

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "hangarListingsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isUnlimitedHangars" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "showInHangarsTab" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "hangarId" TEXT;

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "hangarId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "hangarListingsBalance" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Hangar" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "airfieldName" TEXT NOT NULL,
    "icaoCode" TEXT,
    "city" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "airfieldId" TEXT,
    "doorWidth" DOUBLE PRECISION NOT NULL,
    "doorHeight" DOUBLE PRECISION NOT NULL,
    "interiorWidth" DOUBLE PRECISION,
    "interiorDepth" DOUBLE PRECISION,
    "area" DOUBLE PRECISION,
    "spaceType" "HangarSpaceType",
    "spots" INTEGER,
    "aircraftTypes" "HangarAircraftType"[],
    "services" "HangarService"[],
    "offersSale" BOOLEAN NOT NULL DEFAULT false,
    "salePrice" DECIMAL(14,2),
    "saleCurrency" "ListingCurrency" NOT NULL DEFAULT 'USD',
    "offersRent" BOOLEAN NOT NULL DEFAULT false,
    "rentalType" "HangarRentalType",
    "rentPrice" DECIMAL(12,2),
    "rentCurrency" "ListingCurrency" NOT NULL DEFAULT 'ARS',
    "rentPeriod" "HangarRentPeriod",
    "negotiable" BOOLEAN NOT NULL DEFAULT false,
    "availableFrom" TIMESTAMP(3),
    "status" "AircraftStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "listingStartsAt" TIMESTAMP(3),
    "listingExpiresAt" TIMESTAMP(3),
    "purchaseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hangar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HangarImage" (
    "id" TEXT NOT NULL,
    "hangarId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "HangarImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Hangar_status_listingExpiresAt_createdAt_idx" ON "Hangar"("status", "listingExpiresAt", "createdAt");

-- CreateIndex
CREATE INDEX "Hangar_province_city_idx" ON "Hangar"("province", "city");

-- CreateIndex
CREATE INDEX "Hangar_doorWidth_idx" ON "Hangar"("doorWidth");

-- CreateIndex
CREATE INDEX "Hangar_salePrice_idx" ON "Hangar"("salePrice");

-- CreateIndex
CREATE INDEX "Hangar_rentPrice_idx" ON "Hangar"("rentPrice");

-- CreateIndex
CREATE INDEX "Hangar_sellerId_idx" ON "Hangar"("sellerId");

-- CreateIndex
CREATE INDEX "HangarImage_hangarId_order_idx" ON "HangarImage"("hangarId", "order");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_hangarId_eventType_idx" ON "AnalyticsEvent"("hangarId", "eventType");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_hangarId_key" ON "Favorite"("userId", "hangarId");

-- CreateIndex
CREATE INDEX "Question_hangarId_idx" ON "Question"("hangarId");

-- AddForeignKey
ALTER TABLE "Hangar" ADD CONSTRAINT "Hangar_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hangar" ADD CONSTRAINT "Hangar_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HangarImage" ADD CONSTRAINT "HangarImage_hangarId_fkey" FOREIGN KEY ("hangarId") REFERENCES "Hangar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_hangarId_fkey" FOREIGN KEY ("hangarId") REFERENCES "Hangar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_hangarId_fkey" FOREIGN KEY ("hangarId") REFERENCES "Hangar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_hangarId_fkey" FOREIGN KEY ("hangarId") REFERENCES "Hangar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_hangarId_fkey" FOREIGN KEY ("hangarId") REFERENCES "Hangar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

