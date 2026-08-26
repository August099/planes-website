/*
  Warnings:

  - You are about to drop the column `brandId` on the `Aircraft` table. All the data in the column will be lost.
  - You are about to drop the column `modelId` on the `Aircraft` table. All the data in the column will be lost.
  - You are about to drop the column `brandId` on the `SparePart` table. All the data in the column will be lost.
  - You are about to drop the column `condition` on the `SparePart` table. All the data in the column will be lost.
  - You are about to drop the column `modelId` on the `SparePart` table. All the data in the column will be lost.
  - You are about to drop the `AircraftBrand` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AircraftCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AircraftModel` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AircraftSubCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AircraftSubModel` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SparePartBrand` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SparePartCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SparePartModel` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('STRING', 'NUMBER');

-- CreateEnum
CREATE TYPE "FieldRangeType" AS ENUM ('SLIDE_BAR', 'INPUTS_RANGE', 'SINGLE');

-- DropForeignKey
ALTER TABLE "Aircraft" DROP CONSTRAINT "Aircraft_brandId_fkey";

-- DropForeignKey
ALTER TABLE "Aircraft" DROP CONSTRAINT "Aircraft_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "Aircraft" DROP CONSTRAINT "Aircraft_modelId_fkey";

-- DropForeignKey
ALTER TABLE "AircraftModel" DROP CONSTRAINT "AircraftModel_brandId_fkey";

-- DropForeignKey
ALTER TABLE "AircraftModel" DROP CONSTRAINT "AircraftModel_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "AircraftSubCategory" DROP CONSTRAINT "AircraftSubCategory_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "AircraftSubModel" DROP CONSTRAINT "AircraftSubModel_modelId_fkey";

-- DropForeignKey
ALTER TABLE "SparePart" DROP CONSTRAINT "SparePart_brandId_fkey";

-- DropForeignKey
ALTER TABLE "SparePart" DROP CONSTRAINT "SparePart_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "SparePart" DROP CONSTRAINT "SparePart_modelId_fkey";

-- DropForeignKey
ALTER TABLE "SparePartModel" DROP CONSTRAINT "SparePartModel_brandId_fkey";

-- DropForeignKey
ALTER TABLE "SparePartModel" DROP CONSTRAINT "SparePartModel_categoryId_fkey";

-- DropIndex
DROP INDEX "SparePart_condition_idx";

-- AlterTable
ALTER TABLE "Aircraft" DROP COLUMN "brandId",
DROP COLUMN "modelId";

-- AlterTable
ALTER TABLE "SparePart" DROP COLUMN "brandId",
DROP COLUMN "condition",
DROP COLUMN "modelId";

-- DropTable
DROP TABLE "AircraftBrand";

-- DropTable
DROP TABLE "AircraftCategory";

-- DropTable
DROP TABLE "AircraftModel";

-- DropTable
DROP TABLE "AircraftSubCategory";

-- DropTable
DROP TABLE "AircraftSubModel";

-- DropTable
DROP TABLE "SparePartBrand";

-- DropTable
DROP TABLE "SparePartCategory";

-- DropTable
DROP TABLE "SparePartModel";

-- DropEnum
DROP TYPE "AircraftCondition";

-- DropEnum
DROP TYPE "SparePartCondition";

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubCategory" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "SubCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Field" (
    "id" TEXT NOT NULL,
    "subCategoryId" TEXT,
    "parentFieldId" TEXT,
    "name" TEXT NOT NULL,
    "type" "FieldType" NOT NULL,
    "list" BOOLEAN NOT NULL DEFAULT false,
    "range" BOOLEAN DEFAULT false,
    "rangeType" "FieldRangeType" NOT NULL DEFAULT 'INPUTS_RANGE',
    "min" DECIMAL(65,30),
    "max" DECIMAL(65,30),

    CONSTRAINT "Field_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SubCategory_name_key" ON "SubCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Field_subCategoryId_key" ON "Field"("subCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Field_subCategoryId_name_key" ON "Field"("subCategoryId", "name");

-- AddForeignKey
ALTER TABLE "Aircraft" ADD CONSTRAINT "Aircraft_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubCategory" ADD CONSTRAINT "SubCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Field" ADD CONSTRAINT "Field_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "SubCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Field" ADD CONSTRAINT "Field_parentFieldId_fkey" FOREIGN KEY ("parentFieldId") REFERENCES "Field"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SparePart" ADD CONSTRAINT "SparePart_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
