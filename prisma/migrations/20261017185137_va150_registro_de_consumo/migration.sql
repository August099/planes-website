-- CreateEnum
CREATE TYPE "CreditSource" AS ENUM ('LAUNCH', 'PACK', 'ADMIN', 'LEGACY');

-- CreateEnum
CREATE TYPE "FundingSource" AS ENUM ('LAUNCH_BALANCE', 'PACK', 'SUBSCRIPTION', 'SINGLE_PAYMENT', 'COUPON_100', 'ADMIN', 'LEGACY_BALANCE');

-- CreateEnum
CREATE TYPE "FundingReason" AS ENUM ('PUBLISH', 'RENEWAL', 'FEATURED');

-- CreateTable
CREATE TABLE "CreditLot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "ListingKind" NOT NULL,
    "source" "CreditSource" NOT NULL,
    "purchaseId" TEXT,
    "granted" INTEGER NOT NULL,
    "remaining" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "CreditLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingFunding" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listingKind" "ListingKind" NOT NULL,
    "listingId" TEXT NOT NULL,
    "reason" "FundingReason" NOT NULL,
    "source" "FundingSource" NOT NULL,
    "purchaseId" TEXT,
    "subscriptionId" TEXT,
    "creditLotId" TEXT,
    "previousExpiresAt" TIMESTAMP(3),
    "previousFeaturedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revertedAt" TIMESTAMP(3),
    "revertedPaymentId" TEXT,

    CONSTRAINT "ListingFunding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreditLot_userId_kind_remaining_idx" ON "CreditLot"("userId", "kind", "remaining");

-- CreateIndex
CREATE INDEX "CreditLot_purchaseId_idx" ON "CreditLot"("purchaseId");

-- CreateIndex
CREATE INDEX "ListingFunding_purchaseId_idx" ON "ListingFunding"("purchaseId");

-- CreateIndex
CREATE INDEX "ListingFunding_subscriptionId_createdAt_idx" ON "ListingFunding"("subscriptionId", "createdAt");

-- CreateIndex
CREATE INDEX "ListingFunding_creditLotId_idx" ON "ListingFunding"("creditLotId");

-- CreateIndex
CREATE INDEX "ListingFunding_listingKind_listingId_idx" ON "ListingFunding"("listingKind", "listingId");

-- CreateIndex
CREATE INDEX "ListingFunding_revertedPaymentId_idx" ON "ListingFunding"("revertedPaymentId");

-- AddForeignKey
ALTER TABLE "CreditLot" ADD CONSTRAINT "CreditLot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditLot" ADD CONSTRAINT "CreditLot_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingFunding" ADD CONSTRAINT "ListingFunding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingFunding" ADD CONSTRAINT "ListingFunding_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingFunding" ADD CONSTRAINT "ListingFunding_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingFunding" ADD CONSTRAINT "ListingFunding_creditLotId_fkey" FOREIGN KEY ("creditLotId") REFERENCES "CreditLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- VA-150: saldo que ya existía → lotes. Si la cuenta recibió el saldo de lanzamiento, hasta 1 crédito
-- por tipo es LAUNCH y el resto LEGACY; si no, todo LEGACY. Ninguno se revierte al arrepentirse.
INSERT INTO "CreditLot" ("id", "userId", "kind", "source", "granted", "remaining")
SELECT gen_random_uuid()::text, u."id", k.kind::"ListingKind", 'LAUNCH', LEAST(k.balance, 1), LEAST(k.balance, 1)
FROM "User" u
CROSS JOIN LATERAL (VALUES ('AIRCRAFT', u."aircraftListingsBalance"), ('SPARE_PART', u."sparePartsListingsBalance")) AS k(kind, balance)
WHERE u."launchBalanceGrantedAt" IS NOT NULL AND k.balance > 0;

INSERT INTO "CreditLot" ("id", "userId", "kind", "source", "granted", "remaining")
SELECT gen_random_uuid()::text, u."id", k.kind::"ListingKind", 'LEGACY', k.balance - k.launch, k.balance - k.launch
FROM "User" u
CROSS JOIN LATERAL (VALUES
  ('AIRCRAFT', u."aircraftListingsBalance", CASE WHEN u."launchBalanceGrantedAt" IS NOT NULL THEN LEAST(u."aircraftListingsBalance", 1) ELSE 0 END),
  ('SPARE_PART', u."sparePartsListingsBalance", CASE WHEN u."launchBalanceGrantedAt" IS NOT NULL THEN LEAST(u."sparePartsListingsBalance", 1) ELSE 0 END),
  ('HANGAR', u."hangarListingsBalance", 0)
) AS k(kind, balance, launch)
WHERE k.balance - k.launch > 0;
