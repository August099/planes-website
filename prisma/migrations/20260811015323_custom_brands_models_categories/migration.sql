/*
  Warnings:

  - You are about to drop the column `brand` on the `Aircraft` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `Aircraft` table. All the data in the column will be lost.
  - You are about to drop the column `model` on the `Aircraft` table. All the data in the column will be lost.
  - You are about to drop the column `brand` on the `SparePart` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `SparePart` table. All the data in the column will be lost.
  - You are about to drop the column `model` on the `SparePart` table. All the data in the column will be lost.
  - Added the required column `brandId` to the `Aircraft` table without a default value. This is not possible if the table is not empty.
  - Added the required column `categoryId` to the `Aircraft` table without a default value. This is not possible if the table is not empty.
  - Added the required column `modelId` to the `Aircraft` table without a default value. This is not possible if the table is not empty.
  - Added the required column `brandId` to the `SparePart` table without a default value. This is not possible if the table is not empty.
  - Added the required column `categoryId` to the `SparePart` table without a default value. This is not possible if the table is not empty.
  - Added the required column `modelId` to the `SparePart` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('PARTICULAR', 'RESELLER', 'FACTORY');

-- CreateEnum
CREATE TYPE "AircraftCondition" AS ENUM ('NEW', 'USED');

-- DropIndex
DROP INDEX "Aircraft_brand_model_idx";

-- DropIndex
DROP INDEX "Aircraft_category_idx";

-- DropIndex
DROP INDEX "SparePart_category_idx";

-- AlterTable
ALTER TABLE "Aircraft" DROP COLUMN "brand",
DROP COLUMN "category",
DROP COLUMN "model",
ADD COLUMN     "brandId" TEXT NOT NULL,
ADD COLUMN     "categoryId" TEXT NOT NULL,
ADD COLUMN     "customModel" TEXT,
ADD COLUMN     "financing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "modelId" TEXT NOT NULL,
ADD COLUMN     "trade" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SparePart" DROP COLUMN "brand",
DROP COLUMN "category",
DROP COLUMN "model",
ADD COLUMN     "brandId" TEXT NOT NULL,
ADD COLUMN     "categoryId" TEXT NOT NULL,
ADD COLUMN     "modelId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "userType" "UserType" NOT NULL DEFAULT 'PARTICULAR';

-- DropEnum
DROP TYPE "AircraftBrand";

-- DropEnum
DROP TYPE "AircraftCategory";

-- DropEnum
DROP TYPE "SparePartCategory";

-- CreateTable
CREATE TABLE "AircraftCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "AircraftCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AircraftSubCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "AircraftSubCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AircraftBrand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "AircraftBrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AircraftModel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "AircraftModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AircraftSubModel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,

    CONSTRAINT "AircraftSubModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SparePartCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "SparePartCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SparePartBrand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "SparePartBrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SparePartModel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "SparePartModel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AircraftCategory_name_key" ON "AircraftCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AircraftSubCategory_name_key" ON "AircraftSubCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AircraftBrand_name_key" ON "AircraftBrand"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AircraftModel_name_key" ON "AircraftModel"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AircraftSubModel_name_key" ON "AircraftSubModel"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SparePartCategory_name_key" ON "SparePartCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SparePartBrand_name_key" ON "SparePartBrand"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SparePartModel_name_key" ON "SparePartModel"("name");

-- AddForeignKey
ALTER TABLE "AircraftSubCategory" ADD CONSTRAINT "AircraftSubCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AircraftCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AircraftModel" ADD CONSTRAINT "AircraftModel_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "AircraftBrand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AircraftModel" ADD CONSTRAINT "AircraftModel_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AircraftCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AircraftSubModel" ADD CONSTRAINT "AircraftSubModel_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "AircraftModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aircraft" ADD CONSTRAINT "Aircraft_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "AircraftBrand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aircraft" ADD CONSTRAINT "Aircraft_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "AircraftModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aircraft" ADD CONSTRAINT "Aircraft_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AircraftCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SparePartModel" ADD CONSTRAINT "SparePartModel_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "SparePartBrand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SparePartModel" ADD CONSTRAINT "SparePartModel_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SparePartCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SparePart" ADD CONSTRAINT "SparePart_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "SparePartBrand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SparePart" ADD CONSTRAINT "SparePart_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "SparePartModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SparePart" ADD CONSTRAINT "SparePart_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SparePartCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
