-- AlterTable
ALTER TABLE "Aircraft" ADD COLUMN     "agEquipment" TEXT,
ADD COLUMN     "extraEquipment" TEXT,
ADD COLUMN     "negotiable" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "AircraftEngine" ADD COLUMN     "horsepower" INTEGER;

-- AlterTable
ALTER TABLE "AircraftPropeller" ADD COLUMN     "brand" TEXT;
