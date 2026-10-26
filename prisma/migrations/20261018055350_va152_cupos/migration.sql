-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('PRO', 'BUSINESS');

-- AlterEnum
ALTER TYPE "SparePartStatus" ADD VALUE 'PAUSED';

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "tier" "PlanTier";

-- CreateTable
CREATE TABLE "QuotaSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "freeAircraftQuota" INTEGER NOT NULL DEFAULT 1,
    "freeSparePartQuota" INTEGER NOT NULL DEFAULT 5,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuotaSettings_pkey" PRIMARY KEY ("id")
);
