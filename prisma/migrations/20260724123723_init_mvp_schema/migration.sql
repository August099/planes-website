/*
  Warnings:

  - The values [BIMOTOR,MONOMOTOR,FUMIGADOR_PISTON,FUMIGADOR_TURBOHELICE] on the enum `AircraftCategory` will be removed. If these variants are still used in the database, this will fail.
  - The values [CREDIT_PACK,SUBSCRIPTION] on the enum `PlanType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `allowsAircrafts` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `allowsSpareParts` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `credits` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `creditsRemaining` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `creditsTotal` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `creditsBalance` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Subscription` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "AdBannerStatus" AS ENUM ('PENDING_PAYMENT', 'PENDING_REVIEW', 'ACTIVE', 'EXPIRED', 'REJECTED');

-- AlterEnum
BEGIN;
CREATE TYPE "AircraftCategory_new" AS ENUM ('PISTON', 'TURBOHELICE', 'EXPERIMENTAL', 'HELICOPTERO', 'PROYECTO');
ALTER TABLE "Aircraft" ALTER COLUMN "category" TYPE "AircraftCategory_new" USING ("category"::text::"AircraftCategory_new");
ALTER TYPE "AircraftCategory" RENAME TO "AircraftCategory_old";
ALTER TYPE "AircraftCategory_new" RENAME TO "AircraftCategory";
DROP TYPE "public"."AircraftCategory_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "PlanType_new" AS ENUM ('AIRCRAFT_PACK', 'SPARE_PART_PACK', 'AD_BANNER');
ALTER TABLE "Plan" ALTER COLUMN "type" TYPE "PlanType_new" USING ("type"::text::"PlanType_new");
ALTER TYPE "PlanType" RENAME TO "PlanType_old";
ALTER TYPE "PlanType_new" RENAME TO "PlanType";
DROP TYPE "public"."PlanType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_planId_fkey";

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_userId_fkey";

-- AlterTable
ALTER TABLE "Plan" DROP COLUMN "allowsAircrafts",
DROP COLUMN "allowsSpareParts",
DROP COLUMN "credits",
ADD COLUMN     "aircraftListingsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sparePartsListingsCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Purchase" DROP COLUMN "creditsRemaining",
DROP COLUMN "creditsTotal",
ADD COLUMN     "aircraftListingsRemaining" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "aircraftListingsTotal" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sparePartsListingsRemaining" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sparePartsListingsTotal" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "creditsBalance",
ADD COLUMN     "aircraftListingsBalance" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sparePartsListingsBalance" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "Subscription";

-- DropEnum
DROP TYPE "SubscriptionStatus";

-- CreateTable
CREATE TABLE "AdBanner" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purchaseId" TEXT,
    "title" TEXT,
    "description" TEXT NOT NULL,
    "bannerImageUrl" TEXT,
    "linkUrl" TEXT,
    "status" "AdBannerStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdBanner_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AdBanner" ADD CONSTRAINT "AdBanner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdBanner" ADD CONSTRAINT "AdBanner_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
