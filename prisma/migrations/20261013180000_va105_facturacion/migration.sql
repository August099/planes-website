-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InvoiceStatus" ADD VALUE 'ISSUED_SIMULATED';
ALTER TYPE "InvoiceStatus" ADD VALUE 'SKIPPED';

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "mode" TEXT,
ADD COLUMN     "requestPayload" JSONB,
ADD COLUMN     "skippedAt" TIMESTAMP(3),
ADD COLUMN     "skippedById" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "isTest" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "liveMode" BOOLEAN;

-- CreateIndex
CREATE INDEX "Purchase_couponId_paymentStatus_idx" ON "Purchase"("couponId", "paymentStatus");

