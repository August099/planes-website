/*
  Warnings:

  - You are about to drop the column `subCategoryId` on the `SparePart` table. All the data in the column will be lost.
  - You are about to drop the `SparePartCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SparePartSubCategory` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "FilterType" AS ENUM ('SELECT', 'MULTI_SELECT', 'RANGE', 'BOOLEAN', 'COLOR', 'TEXT');

-- DropForeignKey
ALTER TABLE "SparePart" DROP CONSTRAINT "SparePart_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "SparePart" DROP CONSTRAINT "SparePart_subCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "SparePartSubCategory" DROP CONSTRAINT "SparePartSubCategory_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "SparePartSubCategory" DROP CONSTRAINT "SparePartSubCategory_parentId_fkey";

-- DropIndex
DROP INDEX "SparePart_categoryId_subCategoryId_idx";

-- AlterTable
ALTER TABLE "SparePart" DROP COLUMN "subCategoryId";

-- DropTable
DROP TABLE "SparePartCategory";

-- DropTable
DROP TABLE "SparePartSubCategory";

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilterGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FilterGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Filter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "FilterType" NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "groupId" TEXT NOT NULL,
    "parentId" TEXT,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Filter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilterOption" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "filterId" TEXT NOT NULL,
    "extra" JSONB,

    CONSTRAINT "FilterOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityFilterValue" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "filterId" TEXT NOT NULL,
    "optionId" TEXT,
    "valueString" TEXT,
    "valueNumber" DOUBLE PRECISION,
    "valueBoolean" BOOLEAN,

    CONSTRAINT "EntityFilterValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CategoryFilterGroups" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CategoryFilterGroups_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "FilterGroup_slug_key" ON "FilterGroup"("slug");

-- CreateIndex
CREATE INDEX "Filter_parentId_idx" ON "Filter"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Filter_groupId_slug_key" ON "Filter"("groupId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "FilterOption_filterId_value_key" ON "FilterOption"("filterId", "value");

-- CreateIndex
CREATE INDEX "EntityFilterValue_productId_idx" ON "EntityFilterValue"("productId");

-- CreateIndex
CREATE INDEX "EntityFilterValue_filterId_idx" ON "EntityFilterValue"("filterId");

-- CreateIndex
CREATE UNIQUE INDEX "EntityFilterValue_productId_filterId_optionId_key" ON "EntityFilterValue"("productId", "filterId", "optionId");

-- CreateIndex
CREATE INDEX "_CategoryFilterGroups_B_index" ON "_CategoryFilterGroups"("B");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Filter" ADD CONSTRAINT "Filter_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "FilterGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Filter" ADD CONSTRAINT "Filter_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Filter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilterOption" ADD CONSTRAINT "FilterOption_filterId_fkey" FOREIGN KEY ("filterId") REFERENCES "Filter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityFilterValue" ADD CONSTRAINT "EntityFilterValue_productId_fkey" FOREIGN KEY ("productId") REFERENCES "SparePart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityFilterValue" ADD CONSTRAINT "EntityFilterValue_filterId_fkey" FOREIGN KEY ("filterId") REFERENCES "Filter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityFilterValue" ADD CONSTRAINT "EntityFilterValue_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "FilterOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SparePart" ADD CONSTRAINT "SparePart_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoryFilterGroups" ADD CONSTRAINT "_CategoryFilterGroups_A_fkey" FOREIGN KEY ("A") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoryFilterGroups" ADD CONSTRAINT "_CategoryFilterGroups_B_fkey" FOREIGN KEY ("B") REFERENCES "FilterGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
