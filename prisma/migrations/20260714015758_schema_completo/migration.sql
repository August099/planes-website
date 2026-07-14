/*
  Warnings:

  - The values [PENDING] on the enum `AircraftStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `description` on the `Aircraft` table. All the data in the column will be lost.
  - You are about to drop the column `manufacturer` on the `Aircraft` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Aircraft` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.
  - Added the required column `shortDescription` to the `Aircraft` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SellerType" AS ENUM ('PARTICULAR', 'MAYORISTA');

-- CreateEnum
CREATE TYPE "AircraftBrand" AS ENUM ('AIR_TRACTOR', 'CESSNA', 'PIPER', 'PZL', 'GRUMMAN', 'EMBRAER', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
BEGIN;
CREATE TYPE "AircraftStatus_new" AS ENUM ('PENDING_PAYMENT', 'ACTIVE', 'EXPIRED', 'SOLD');
ALTER TABLE "public"."Aircraft" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Aircraft" ALTER COLUMN "status" TYPE "AircraftStatus_new" USING ("status"::text::"AircraftStatus_new");
ALTER TYPE "AircraftStatus" RENAME TO "AircraftStatus_old";
ALTER TYPE "AircraftStatus_new" RENAME TO "AircraftStatus";
DROP TYPE "public"."AircraftStatus_old";
ALTER TABLE "Aircraft" ALTER COLUMN "status" SET DEFAULT 'PENDING_PAYMENT';
COMMIT;

-- DropIndex
DROP INDEX "Aircraft_manufacturer_model_idx";

-- AlterTable
ALTER TABLE "Aircraft" DROP COLUMN "description",
DROP COLUMN "manufacturer",
DROP COLUMN "title",
ADD COLUMN     "brand" "AircraftBrand",
ADD COLUMN     "customBrand" TEXT,
ADD COLUMN     "extraDescription" TEXT,
ADD COLUMN     "listingExpiresAt" TIMESTAMP(3),
ADD COLUMN     "listingStartsAt" TIMESTAMP(3),
ADD COLUMN     "modifications" TEXT,
ADD COLUMN     "priceOnRequest" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "purchaseId" TEXT,
ADD COLUMN     "renewalEmailSentAt" TIMESTAMP(3),
ADD COLUMN     "shortDescription" TEXT NOT NULL,
ALTER COLUMN "model" DROP NOT NULL,
ALTER COLUMN "year" DROP NOT NULL,
ALTER COLUMN "price" DROP NOT NULL,
ALTER COLUMN "category" DROP NOT NULL,
ALTER COLUMN "totalTimeHours" DROP NOT NULL,
ALTER COLUMN "location" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'PENDING_PAYMENT';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role",
ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sellerType" "SellerType" NOT NULL DEFAULT 'PARTICULAR';

-- DropEnum
DROP TYPE "Role";

-- CreateTable
CREATE TABLE "AircraftDocument" (
    "id" TEXT NOT NULL,
    "aircraftId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AircraftDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "aircraftId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "reporterEmail" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sellerType" "SellerType" NOT NULL,
    "postsIncluded" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "creditsTotal" INTEGER NOT NULL,
    "creditsRemaining" INTEGER NOT NULL,
    "mpPreferenceId" TEXT,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Aircraft_brand_model_idx" ON "Aircraft"("brand", "model");

-- CreateIndex
CREATE INDEX "Aircraft_status_idx" ON "Aircraft"("status");

-- AddForeignKey
ALTER TABLE "Aircraft" ADD CONSTRAINT "Aircraft_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AircraftDocument" ADD CONSTRAINT "AircraftDocument_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
