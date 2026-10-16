-- CreateEnum
CREATE TYPE "WebhookStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'IGNORED', 'REJECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "InvoiceKind" AS ENUM ('FACTURA_C', 'NOTA_CREDITO_C');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'ISSUED', 'ERROR');

-- CreateEnum
CREATE TYPE "BillingPartyKind" AS ENUM ('CONSUMIDOR_FINAL', 'EMPRESA');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentStatus" ADD VALUE 'IN_PROCESS';
ALTER TYPE "PaymentStatus" ADD VALUE 'CANCELLED';
ALTER TYPE "PaymentStatus" ADD VALUE 'REFUNDED';
ALTER TYPE "PaymentStatus" ADD VALUE 'PARTIALLY_REFUNDED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SubscriptionStatus" ADD VALUE 'PENDING';
ALTER TYPE "SubscriptionStatus" ADD VALUE 'PAST_DUE';

-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN     "activatedAt" TIMESTAMP(3),
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "billingSnapshot" JSONB,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'ARS',
ADD COLUMN     "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "listingKind" "ListingKind",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "planId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "graceUntil" TIMESTAMP(3),
ADD COLUMN     "lastPaymentAt" TIMESTAMP(3),
ADD COLUMN     "mpStatus" TEXT;

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'MERCADOPAGO',
    "mpPaymentId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "statusDetail" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "refundedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "method" TEXT,
    "paymentType" TEXT,
    "approvedAt" TIMESTAMP(3),
    "purchaseId" TEXT,
    "subscriptionId" TEXT,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'MERCADOPAGO',
    "topic" TEXT NOT NULL,
    "action" TEXT,
    "externalId" TEXT,
    "requestId" TEXT,
    "signatureValid" BOOLEAN NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "WebhookStatus" NOT NULL DEFAULT 'RECEIVED',
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "kind" "InvoiceKind" NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "paymentId" TEXT NOT NULL,
    "invoicedPaymentId" TEXT,
    "refundRef" TEXT,
    "originalInvoiceId" TEXT,
    "pointOfSale" INTEGER,
    "number" INTEGER,
    "cae" TEXT,
    "caeExpiresAt" TIMESTAMP(3),
    "total" DECIMAL(12,2) NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "receiver" JSONB NOT NULL,
    "arcaObservations" TEXT,
    "errors" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3),
    "pdfPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "BillingPartyKind" NOT NULL,
    "docType" TEXT,
    "docNumber" TEXT,
    "name" TEXT NOT NULL,
    "ivaCondition" TEXT NOT NULL DEFAULT 'CF',
    "email" TEXT NOT NULL,
    "address" TEXT,
    "province" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "monotributoAnnualCap" DECIMAL(14,2),
    "alertThresholdPercent" INTEGER NOT NULL DEFAULT 80,
    "lastCapAlertAt" TIMESTAMP(3),
    "dniRequiredFrom" DECIMAL(14,2) NOT NULL DEFAULT 10000000,
    "graceDays" INTEGER NOT NULL DEFAULT 7,
    "maxInvoiceAttempts" INTEGER NOT NULL DEFAULT 5,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_mpPaymentId_key" ON "Payment"("mpPaymentId");

-- CreateIndex
CREATE INDEX "Payment_purchaseId_idx" ON "Payment"("purchaseId");

-- CreateIndex
CREATE INDEX "Payment_subscriptionId_idx" ON "Payment"("subscriptionId");

-- CreateIndex
CREATE INDEX "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");

-- CreateIndex
CREATE INDEX "WebhookEvent_provider_externalId_idx" ON "WebhookEvent"("provider", "externalId");

-- CreateIndex
CREATE INDEX "WebhookEvent_status_receivedAt_idx" ON "WebhookEvent"("status", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoicedPaymentId_key" ON "Invoice"("invoicedPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_refundRef_key" ON "Invoice"("refundRef");

-- CreateIndex
CREATE INDEX "Invoice_status_nextAttemptAt_idx" ON "Invoice"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "Invoice_issuedAt_idx" ON "Invoice"("issuedAt");

-- CreateIndex
CREATE INDEX "Invoice_paymentId_idx" ON "Invoice"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_kind_pointOfSale_number_key" ON "Invoice"("kind", "pointOfSale", "number");

-- CreateIndex
CREATE UNIQUE INDEX "BillingProfile_userId_key" ON "BillingProfile"("userId");

-- CreateIndex
CREATE INDEX "Purchase_userId_createdAt_idx" ON "Purchase"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Purchase_paymentStatus_createdAt_idx" ON "Purchase"("paymentStatus", "createdAt");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_originalInvoiceId_fkey" FOREIGN KEY ("originalInvoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingProfile" ADD CONSTRAINT "BillingProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

