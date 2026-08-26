/*
  Warnings:

  - You are about to drop the column `parentFieldId` on the `Field` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Field" DROP CONSTRAINT "Field_parentFieldId_fkey";

-- DropIndex
DROP INDEX "Field_parentFieldId_name_key";

-- AlterTable
ALTER TABLE "Field" DROP COLUMN "parentFieldId";

-- AlterTable
ALTER TABLE "SubCategory" ADD COLUMN     "parentId" TEXT;

-- AddForeignKey
ALTER TABLE "SubCategory" ADD CONSTRAINT "SubCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "SubCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
