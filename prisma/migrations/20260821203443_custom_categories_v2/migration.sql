/*
  Warnings:

  - A unique constraint covering the columns `[parentFieldId,name]` on the table `Field` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Field_subCategoryId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Field_parentFieldId_name_key" ON "Field"("parentFieldId", "name");
