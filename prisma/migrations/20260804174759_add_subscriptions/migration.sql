/*
  Warnings:

  - You are about to drop the column `aircraftListingsRemaining` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `aircraftListingsTotal` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `sparePartsListingsRemaining` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `sparePartsListingsTotal` on the `Purchase` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PlanBillingType" AS ENUM ('ONE_TIME', 'SUBSCRIPTION');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED');

-- AlterEnum
ALTER TYPE "PlanType" ADD VALUE 'SUBSCRIPTION';

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "billingInterval" "BillingInterval",
ADD COLUMN     "billingType" "PlanBillingType" NOT NULL DEFAULT 'ONE_TIME',
ADD COLUMN     "isUnlimitedAircraft" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isUnlimitedSpareParts" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Purchase" DROP COLUMN "aircraftListingsRemaining",
DROP COLUMN "aircraftListingsTotal",
DROP COLUMN "sparePartsListingsRemaining",
DROP COLUMN "sparePartsListingsTotal";

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "mpSubscriptionId" TEXT,
    "stripeSubscriptionId" TEXT,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_mpSubscriptionId_key" ON "Subscription"("mpSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
