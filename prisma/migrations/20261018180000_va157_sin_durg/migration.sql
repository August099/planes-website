-- VA-157: se quita DURG/SMOH del motor (decisión de los socios, 18/10). 36 avisos lo tenían cargado en va_dev.
-- AlterTable
ALTER TABLE "AircraftEngine" DROP COLUMN "DURG";
