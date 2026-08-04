/*
  Warnings:

  - The values [PISTON,TURBOHELICE] on the enum `AircraftCategory` will be removed. If these variants are still used in the database, this will fail.
  - The values [MECANICO,ESTRUCTURAL,PIEZA_MOVIL,AVIONICA_Y_RADIO,EQUIPO_DE_FUMIGACION] on the enum `SparePartCategory` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AircraftBrand" ADD VALUE 'CIRRUS';
ALTER TYPE "AircraftBrand" ADD VALUE 'DIAMOND';
ALTER TYPE "AircraftBrand" ADD VALUE 'MAULE';
ALTER TYPE "AircraftBrand" ADD VALUE 'MOONEY';
ALTER TYPE "AircraftBrand" ADD VALUE 'TECNAM';
ALTER TYPE "AircraftBrand" ADD VALUE 'THRUSH';
ALTER TYPE "AircraftBrand" ADD VALUE 'BOMBARDIER';
ALTER TYPE "AircraftBrand" ADD VALUE 'DASSAULT';
ALTER TYPE "AircraftBrand" ADD VALUE 'GULFSTREAM';
ALTER TYPE "AircraftBrand" ADD VALUE 'PILATUS';
ALTER TYPE "AircraftBrand" ADD VALUE 'HONDA';
ALTER TYPE "AircraftBrand" ADD VALUE 'DAHER';
ALTER TYPE "AircraftBrand" ADD VALUE 'DE_HAVILLAND';
ALTER TYPE "AircraftBrand" ADD VALUE 'LEONARDO';
ALTER TYPE "AircraftBrand" ADD VALUE 'ROBINSON';
ALTER TYPE "AircraftBrand" ADD VALUE 'SIKORSKY';
ALTER TYPE "AircraftBrand" ADD VALUE 'MD_HELICOPTERS';
ALTER TYPE "AircraftBrand" ADD VALUE 'ENSTROM';
ALTER TYPE "AircraftBrand" ADD VALUE 'ATR';
ALTER TYPE "AircraftBrand" ADD VALUE 'FOKKER';
ALTER TYPE "AircraftBrand" ADD VALUE 'SAAB';

-- AlterEnum
BEGIN;
CREATE TYPE "AircraftCategory_new" AS ENUM ('MONOMOTOR', 'BIMOTOR', 'AGRICOLA', 'EXPERIMENTAL', 'HELICOPTERO', 'PROYECTO');
ALTER TABLE "Aircraft" ALTER COLUMN "category" TYPE "AircraftCategory_new" USING ("category"::text::"AircraftCategory_new");
ALTER TYPE "AircraftCategory" RENAME TO "AircraftCategory_old";
ALTER TYPE "AircraftCategory_new" RENAME TO "AircraftCategory";
DROP TYPE "public"."AircraftCategory_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "SparePartCategory_new" AS ENUM ('AVIONICS_RADIO', 'ENGINE', 'AIRFRAME', 'SPRAYING', 'PROPELLER', 'HARDWARE', 'ELECTRICAL', 'INTERIOR', 'OTHER');
ALTER TABLE "SparePart" ALTER COLUMN "category" TYPE "SparePartCategory_new" USING ("category"::text::"SparePartCategory_new");
ALTER TYPE "SparePartCategory" RENAME TO "SparePartCategory_old";
ALTER TYPE "SparePartCategory_new" RENAME TO "SparePartCategory";
DROP TYPE "public"."SparePartCategory_old";
COMMIT;
