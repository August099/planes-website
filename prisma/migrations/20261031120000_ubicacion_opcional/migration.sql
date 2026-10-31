-- 31/10: ciudad y provincia opcionales en aviones y repuestos (en producción ya se corrió a mano en Supabase;
-- DROP NOT NULL no falla si la columna ya acepta vacíos).
ALTER TABLE "Aircraft" ALTER COLUMN "city" DROP NOT NULL;
ALTER TABLE "Aircraft" ALTER COLUMN "province" DROP NOT NULL;
ALTER TABLE "SparePart" ALTER COLUMN "city" DROP NOT NULL;
ALTER TABLE "SparePart" ALTER COLUMN "province" DROP NOT NULL;
