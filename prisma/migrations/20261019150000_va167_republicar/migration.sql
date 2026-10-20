-- VA-167: republicar. lastPublishedAt ordena "Más recientes" y "Últimas publicaciones"; arranca igual a
-- createdAt (el orden de hoy) y solo cambia al republicar. El saldo sale de contar Republication.
-- AlterTable
ALTER TABLE "Aircraft" ADD COLUMN     "lastPublishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
-- AlterTable
ALTER TABLE "SparePart" ADD COLUMN     "lastPublishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "Aircraft" SET "lastPublishedAt" = "createdAt";
UPDATE "SparePart" SET "lastPublishedAt" = "createdAt";
-- CreateTable
CREATE TABLE "Republication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "aircraftId" TEXT,
    "sparePartId" TEXT,
    "bulk" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Republication_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "Republication_userId_createdAt_idx" ON "Republication"("userId", "createdAt");
-- CreateIndex
CREATE INDEX "Republication_aircraftId_idx" ON "Republication"("aircraftId");
-- CreateIndex
CREATE INDEX "Republication_sparePartId_idx" ON "Republication"("sparePartId");
-- CreateIndex
CREATE INDEX "Aircraft_status_lastPublishedAt_idx" ON "Aircraft"("status", "lastPublishedAt");
-- CreateIndex
CREATE INDEX "SparePart_status_lastPublishedAt_idx" ON "SparePart"("status", "lastPublishedAt");
-- AddForeignKey
ALTER TABLE "Republication" ADD CONSTRAINT "Republication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "Republication" ADD CONSTRAINT "Republication_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "Republication" ADD CONSTRAINT "Republication_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart"("id") ON DELETE SET NULL ON UPDATE CASCADE;
