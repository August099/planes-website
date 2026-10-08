-- VA-44: horas totales, descripción de aviónica y TBO pasan a ser opcionales
-- (son obligatorios según la categoría: ver lib/aircraft-rules.ts). No borra ni cambia datos.
-- AlterTable
ALTER TABLE "Aircraft" ALTER COLUMN "totalTimeHours" DROP NOT NULL,
ALTER COLUMN "avDescription" DROP NOT NULL;

-- AlterTable
ALTER TABLE "AircraftEngine" ALTER COLUMN "TBO" DROP NOT NULL;

