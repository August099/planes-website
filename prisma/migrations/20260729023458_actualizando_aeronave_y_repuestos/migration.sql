/*
  Warnings:

  - You are about to drop the column `engineHours` on the `Aircraft` table. All the data in the column will be lost.
  - You are about to drop the column `extraDescription` on the `Aircraft` table. All the data in the column will be lost.
  - You are about to drop the column `priceOnRequest` on the `Aircraft` table. All the data in the column will be lost.
  - You are about to drop the column `shortDescription` on the `Aircraft` table. All the data in the column will be lost.
  - You are about to drop the column `extraDescription` on the `SparePart` table. All the data in the column will be lost.
  - You are about to drop the column `priceOnRequest` on the `SparePart` table. All the data in the column will be lost.
  - You are about to drop the column `shortDescription` on the `SparePart` table. All the data in the column will be lost.
  - Added the required column `description` to the `Aircraft` table without a default value. This is not possible if the table is not empty.
  - Made the column `brand` on table `Aircraft` required. This step will fail if there are existing NULL values in that column.
  - Made the column `model` on table `Aircraft` required. This step will fail if there are existing NULL values in that column.
  - Made the column `year` on table `Aircraft` required. This step will fail if there are existing NULL values in that column.
  - Made the column `totalTimeHours` on table `Aircraft` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `userId` to the `Report` table without a default value. This is not possible if the table is not empty.
  - Added the required column `description` to the `SparePart` table without a default value. This is not possible if the table is not empty.
  - Made the column `brand` on table `SparePart` required. This step will fail if there are existing NULL values in that column.
  - Made the column `model` on table `SparePart` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Aircraft" DROP COLUMN "engineHours",
DROP COLUMN "extraDescription",
DROP COLUMN "priceOnRequest",
DROP COLUMN "shortDescription",
ADD COLUMN     "avionics" TEXT,
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "extraEquipment" TEXT,
ADD COLUMN     "fuselageDescription" TEXT,
ADD COLUMN     "fuselageModifications" TEXT,
ALTER COLUMN "brand" SET NOT NULL,
ALTER COLUMN "model" SET NOT NULL,
ALTER COLUMN "year" SET NOT NULL,
ALTER COLUMN "totalTimeHours" SET NOT NULL;

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "SparePart" DROP COLUMN "extraDescription",
DROP COLUMN "priceOnRequest",
DROP COLUMN "shortDescription",
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "stock" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "brand" SET NOT NULL,
ALTER COLUMN "model" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "facebook" TEXT,
ADD COLUMN     "instagram" TEXT;

-- CreateTable
CREATE TABLE "AircraftEngine" (
    "id" TEXT NOT NULL,
    "aircraftId" TEXT NOT NULL,
    "engineHours" INTEGER,
    "TBO" INTEGER NOT NULL,
    "brand" TEXT,
    "model" TEXT,

    CONSTRAINT "AircraftEngine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AircraftPropeller" (
    "id" TEXT NOT NULL,
    "aircraftId" TEXT NOT NULL,
    "propellerHours" INTEGER,
    "model" TEXT,

    CONSTRAINT "AircraftPropeller_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AircraftEngine" ADD CONSTRAINT "AircraftEngine_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AircraftPropeller" ADD CONSTRAINT "AircraftPropeller_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
