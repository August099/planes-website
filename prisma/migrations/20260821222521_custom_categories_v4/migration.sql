/*
  Warnings:

  - You are about to drop the column `avionics` on the `Aircraft` table. All the data in the column will be lost.
  - You are about to drop the column `extraEquipment` on the `Aircraft` table. All the data in the column will be lost.
  - You are about to drop the column `fuselageDescription` on the `Aircraft` table. All the data in the column will be lost.
  - You are about to drop the column `fuselageModifications` on the `Aircraft` table. All the data in the column will be lost.
  - You are about to drop the column `modifications` on the `Aircraft` table. All the data in the column will be lost.
  - You are about to drop the column `renewalEmailSentAt` on the `Aircraft` table. All the data in the column will be lost.
  - You are about to drop the column `renewalEmailSentAt` on the `SparePart` table. All the data in the column will be lost.
  - You are about to drop the `Category` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Field` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SubCategory` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "EngineType" AS ENUM ('PISTON', 'TURBOPROP');

-- CreateEnum
CREATE TYPE "AircraftCondition" AS ENUM ('NUEVO', 'USADO');

-- DropForeignKey
ALTER TABLE "Aircraft" DROP CONSTRAINT "Aircraft_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "Field" DROP CONSTRAINT "Field_subCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "SparePart" DROP CONSTRAINT "SparePart_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "SubCategory" DROP CONSTRAINT "SubCategory_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "SubCategory" DROP CONSTRAINT "SubCategory_parentId_fkey";

-- AlterTable
ALTER TABLE "Aircraft" DROP COLUMN "avionics",
DROP COLUMN "extraEquipment",
DROP COLUMN "fuselageDescription",
DROP COLUMN "fuselageModifications",
DROP COLUMN "modifications",
DROP COLUMN "renewalEmailSentAt",
ADD COLUMN     "brandId" TEXT,
ADD COLUMN     "condition" "AircraftCondition" NOT NULL DEFAULT 'USADO',
ADD COLUMN     "engineType" "EngineType",
ADD COLUMN     "modelId" TEXT,
ADD COLUMN     "subModelId" TEXT;

-- AlterTable
ALTER TABLE "SparePart" DROP COLUMN "renewalEmailSentAt",
ADD COLUMN     "attributes" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "subCategoryId" TEXT;

-- DropTable
DROP TABLE "Category";

-- DropTable
DROP TABLE "Field";

-- DropTable
DROP TABLE "SubCategory";

-- DropEnum
DROP TYPE "FieldRangeType";

-- DropEnum
DROP TYPE "FieldType";

-- CreateTable
CREATE TABLE "AircraftCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "AircraftCategory_pkey" PRIMARY KEY ("id")
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
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "AircraftModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AircraftSubModel" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "AircraftSubModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SparePartCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "SparePartCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SparePartSubCategory" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "attributeSchema" JSONB,

    CONSTRAINT "SparePartSubCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AircraftCategory_name_key" ON "AircraftCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AircraftBrand_name_key" ON "AircraftBrand"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AircraftModel_brandId_name_key" ON "AircraftModel"("brandId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "AircraftSubModel_modelId_name_key" ON "AircraftSubModel"("modelId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "SparePartCategory_name_key" ON "SparePartCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SparePartSubCategory_categoryId_name_key" ON "SparePartSubCategory"("categoryId", "name");

-- CreateIndex
CREATE INDEX "Aircraft_brandId_modelId_idx" ON "Aircraft"("brandId", "modelId");

-- CreateIndex
CREATE INDEX "Aircraft_year_idx" ON "Aircraft"("year");

-- CreateIndex
CREATE INDEX "SparePart_categoryId_subCategoryId_idx" ON "SparePart"("categoryId", "subCategoryId");

-- AddForeignKey
ALTER TABLE "AircraftModel" ADD CONSTRAINT "AircraftModel_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "AircraftBrand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AircraftSubModel" ADD CONSTRAINT "AircraftSubModel_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "AircraftModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aircraft" ADD CONSTRAINT "Aircraft_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AircraftCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aircraft" ADD CONSTRAINT "Aircraft_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "AircraftBrand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aircraft" ADD CONSTRAINT "Aircraft_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "AircraftModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aircraft" ADD CONSTRAINT "Aircraft_subModelId_fkey" FOREIGN KEY ("subModelId") REFERENCES "AircraftSubModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SparePartSubCategory" ADD CONSTRAINT "SparePartSubCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SparePartCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SparePartSubCategory" ADD CONSTRAINT "SparePartSubCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "SparePartSubCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SparePart" ADD CONSTRAINT "SparePart_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SparePartCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SparePart" ADD CONSTRAINT "SparePart_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "SparePartSubCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
