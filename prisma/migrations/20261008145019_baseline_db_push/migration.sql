-- CreateEnum
CREATE TYPE "CouponType" AS ENUM ('DISCOUNT', 'RENEWAL');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'FULL_DISCOUNT');

-- CreateEnum
CREATE TYPE "CouponScope" AS ENUM ('ALL', 'AIRCRAFT', 'SPARE_PART', 'AD_BANNER');

-- CreateEnum
CREATE TYPE "SparepartCondition" AS ENUM ('NUEVO', 'USADO', 'RECORRIDO', 'REPARAR');

-- CreateEnum
CREATE TYPE "AnalyticsEventType" AS ENUM ('PAGE_VIEW', 'AIRCRAFT_VIEW', 'SPARE_PART_VIEW', 'SEARCH', 'FILTER_APPLIED', 'CONTACT_SELLER', 'WHATSAPP_CLICK', 'PHONE_CLICK', 'EMAIL_CLICK', 'CREATE_AIRCRAFT_LISTING', 'CREATE_SPARE_PART_LISTING', 'LISTING_SOLD', 'LISTING_EXPIRED', 'LISTING_RENEWED', 'CHECKOUT_STARTED', 'PAYMENT_COMPLETED', 'PAYMENT_FAILED', 'REFUND_ISSUED', 'SUBSCRIPTION_STARTED', 'SUBSCRIPTION_RENEWED', 'SUBSCRIPTION_CANCELLED', 'AD_PURCHASED', 'USER_REGISTERED');

-- AlterEnum
BEGIN;
CREATE TYPE "FilterType_new" AS ENUM ('SELECT', 'MULTI_SELECT', 'RANGE', 'BOOLEAN', 'TEXT');
ALTER TABLE "Filter" ALTER COLUMN "type" TYPE "FilterType_new" USING ("type"::text::"FilterType_new");
ALTER TYPE "FilterType" RENAME TO "FilterType_old";
ALTER TYPE "FilterType_new" RENAME TO "FilterType";
DROP TYPE "public"."FilterType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Category" DROP CONSTRAINT "Category_parentId_fkey";

-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_userId_fkey";

-- AlterTable
ALTER TABLE "Aircraft" ADD COLUMN     "airconditioner" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "avAaptoifr" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "avAutopilot" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "avDescription" TEXT NOT NULL,
ADD COLUMN     "certDate" TIMESTAMP(3),
ADD COLUMN     "certified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "extDescription" TEXT,
ADD COLUMN     "intDescription" TEXT,
ADD COLUMN     "oxygen" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "passengers" INTEGER,
ADD COLUMN     "plate" TEXT,
ADD COLUMN     "rent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "AircraftBrand" ADD COLUMN     "logoUrl" TEXT;

-- AlterTable
ALTER TABLE "AircraftEngine" ADD COLUMN     "DURG" INTEGER,
ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "AircraftModel" ADD COLUMN     "defaultCategoryId" TEXT;

-- AlterTable
ALTER TABLE "AircraftPropeller" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "AircraftSubModel" ADD COLUMN     "categoryOverride" TEXT;

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "icon" TEXT;

-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN     "couponId" TEXT,
ADD COLUMN     "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "finalPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "originalPrice" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Report" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SparePart" ADD COLUMN     "aircrafts" TEXT[],
ADD COLUMN     "brand" TEXT,
ADD COLUMN     "condition" "SparepartCondition" NOT NULL DEFAULT 'USADO',
ADD COLUMN     "inPesos" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "attributes" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "isFoundingMember" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "eventType" "AnalyticsEventType" NOT NULL,
    "userId" TEXT,
    "anonymousId" TEXT,
    "aircraftId" TEXT,
    "sparePartId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "referrer" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "CouponType" NOT NULL DEFAULT 'DISCOUNT',
    "discountType" "DiscountType",
    "discountValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "scope" "CouponScope" NOT NULL DEFAULT 'ALL',
    "maxUses" INTEGER,
    "currentUses" INTEGER NOT NULL DEFAULT 0,
    "maxUsesPerUser" INTEGER NOT NULL DEFAULT 1,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponUsage" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purchaseId" TEXT,
    "aircraftId" TEXT,
    "sparePartId" TEXT,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalyticsEvent_eventType_createdAt_idx" ON "AnalyticsEvent"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_aircraftId_eventType_idx" ON "AnalyticsEvent"("aircraftId", "eventType");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_sparePartId_eventType_idx" ON "AnalyticsEvent"("sparePartId", "eventType");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_userId_idx" ON "AnalyticsEvent"("userId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_anonymousId_idx" ON "AnalyticsEvent"("anonymousId");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CouponUsage_purchaseId_key" ON "CouponUsage"("purchaseId");

-- CreateIndex
CREATE INDEX "CouponUsage_couponId_userId_idx" ON "CouponUsage"("couponId", "userId");

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AircraftModel" ADD CONSTRAINT "AircraftModel_defaultCategoryId_fkey" FOREIGN KEY ("defaultCategoryId") REFERENCES "AircraftCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AircraftSubModel" ADD CONSTRAINT "AircraftSubModel_categoryOverride_fkey" FOREIGN KEY ("categoryOverride") REFERENCES "AircraftCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponUsage" ADD CONSTRAINT "CouponUsage_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponUsage" ADD CONSTRAINT "CouponUsage_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponUsage" ADD CONSTRAINT "CouponUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
