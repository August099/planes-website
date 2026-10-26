-- AlterTable
ALTER TABLE "Favorite" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- VA-151: los favoritos que ya existían no tienen fecha real; quedan con una anterior al panel
-- para no contarlos como nuevos.
UPDATE "Favorite" SET "createdAt" = TIMESTAMP '2026-01-01 00:00:00';
