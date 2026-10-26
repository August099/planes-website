-- CreateEnum
CREATE TYPE "ListingKind" AS ENUM ('AIRCRAFT', 'SPARE_PART');

-- CreateTable
CREATE TABLE "ListingPrice" (
    "kind" "ListingKind" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingPrice_pkey" PRIMARY KEY ("kind")
);

-- CreateTable
CREATE TABLE "ListingPriceChange" (
    "id" TEXT NOT NULL,
    "kind" "ListingKind" NOT NULL,
    "previousAmount" DECIMAL(12,2) NOT NULL,
    "newAmount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "adminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingPriceChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListingPriceChange_kind_createdAt_idx" ON "ListingPriceChange"("kind", "createdAt");

-- AddForeignKey
ALTER TABLE "ListingPriceChange" ADD CONSTRAINT "ListingPriceChange_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- VA-59: precios iniciales = "Plan 1 Avión" y "Plan 1 Repuesto" de /plans (ARS).
INSERT INTO "ListingPrice" ("kind", "amount", "currency", "updatedAt") VALUES
  ('AIRCRAFT', 30000, 'ARS', CURRENT_TIMESTAMP),
  ('SPARE_PART', 15000, 'ARS', CURRENT_TIMESTAMP)
ON CONFLICT ("kind") DO NOTHING;
