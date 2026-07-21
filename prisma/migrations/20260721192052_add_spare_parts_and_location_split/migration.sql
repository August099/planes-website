/*
  Warnings:

  - The values [MULTIMOTOR,TURBOHELICE,JET] on the enum `AircraftCategory` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `location` on the `Aircraft` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,aircraftId,sparePartId]` on the table `Favorite` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `city` to the `Aircraft` table without a default value. This is not possible if the table is not empty.
  - Added the required column `province` to the `Aircraft` table without a default value. This is not possible if the table is not empty.
  - Made the column `passwordHash` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "SparePartStatus" AS ENUM ('PENDING_PAYMENT', 'ACTIVE', 'EXPIRED', 'SOLD');

-- CreateEnum
CREATE TYPE "SparePartCategory" AS ENUM ('MECANICO', 'ESTRUCTURAL', 'PIEZA_MOVIL', 'AVIONICA_Y_RADIO', 'EQUIPO_DE_FUMIGACION');

-- CreateEnum
CREATE TYPE "SparePartCondition" AS ENUM ('NUEVO', 'USADO', 'REMANUFACTURADO');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AircraftBrand" ADD VALUE 'BELL';
ALTER TYPE "AircraftBrand" ADD VALUE 'CICARE';
ALTER TYPE "AircraftBrand" ADD VALUE 'AIRBUS';
ALTER TYPE "AircraftBrand" ADD VALUE 'AERO_BOERO';
ALTER TYPE "AircraftBrand" ADD VALUE 'BEECHCRAFT';

-- AlterEnum
BEGIN;
CREATE TYPE "AircraftCategory_new" AS ENUM ('BIMOTOR', 'MONOMOTOR', 'FUMIGADOR_PISTON', 'FUMIGADOR_TURBOHELICE', 'EXPERIMENTAL', 'HELICOPTERO', 'PROYECTO');
ALTER TABLE "Aircraft" ALTER COLUMN "category" TYPE "AircraftCategory_new" USING ("category"::text::"AircraftCategory_new");
ALTER TYPE "AircraftCategory" RENAME TO "AircraftCategory_old";
ALTER TYPE "AircraftCategory_new" RENAME TO "AircraftCategory";
DROP TYPE "public"."AircraftCategory_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Favorite" DROP CONSTRAINT "Favorite_aircraftId_fkey";

-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_aircraftId_fkey";

-- DropIndex
DROP INDEX "Favorite_userId_aircraftId_key";

-- AlterTable
ALTER TABLE "Aircraft" DROP COLUMN "location",
ADD COLUMN     "city" TEXT NOT NULL,
ADD COLUMN     "province" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Favorite" ADD COLUMN     "sparePartId" TEXT,
ALTER COLUMN "aircraftId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "sparePartId" TEXT,
ALTER COLUMN "aircraftId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "passwordHash" SET NOT NULL;

-- CreateTable
CREATE TABLE "SparePart" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "price" DECIMAL(12,2),
    "priceOnRequest" BOOLEAN NOT NULL DEFAULT false,
    "category" "SparePartCategory" NOT NULL,
    "condition" "SparePartCondition" NOT NULL,
    "city" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "partNumber" TEXT,
    "extraDescription" TEXT,
    "status" "SparePartStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "purchaseId" TEXT,
    "listingStartsAt" TIMESTAMP(3),
    "listingExpiresAt" TIMESTAMP(3),
    "renewalEmailSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SparePart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SparePartImage" (
    "id" TEXT NOT NULL,
    "sparePartId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SparePartImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SparePartLead" (
    "id" TEXT NOT NULL,
    "sparePartId" TEXT NOT NULL,
    "buyerName" TEXT NOT NULL,
    "buyerEmail" TEXT NOT NULL,
    "buyerPhone" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SparePartLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AircraftToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AircraftToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "SparePart_category_idx" ON "SparePart"("category");

-- CreateIndex
CREATE INDEX "SparePart_condition_idx" ON "SparePart"("condition");

-- CreateIndex
CREATE INDEX "SparePart_price_idx" ON "SparePart"("price");

-- CreateIndex
CREATE INDEX "SparePart_status_idx" ON "SparePart"("status");

-- CreateIndex
CREATE INDEX "SparePart_province_city_idx" ON "SparePart"("province", "city");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- CreateIndex
CREATE INDEX "_AircraftToTag_B_index" ON "_AircraftToTag"("B");

-- CreateIndex
CREATE INDEX "Aircraft_province_city_idx" ON "Aircraft"("province", "city");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_aircraftId_sparePartId_key" ON "Favorite"("userId", "aircraftId", "sparePartId");

-- AddForeignKey
ALTER TABLE "SparePart" ADD CONSTRAINT "SparePart_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SparePart" ADD CONSTRAINT "SparePart_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SparePartImage" ADD CONSTRAINT "SparePartImage_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SparePartLead" ADD CONSTRAINT "SparePartLead_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AircraftToTag" ADD CONSTRAINT "_AircraftToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Aircraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AircraftToTag" ADD CONSTRAINT "_AircraftToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
