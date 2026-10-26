-- DropIndex
DROP INDEX "Favorite_userId_aircraftId_sparePartId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_aircraftId_key" ON "Favorite"("userId", "aircraftId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_sparePartId_key" ON "Favorite"("userId", "sparePartId");

