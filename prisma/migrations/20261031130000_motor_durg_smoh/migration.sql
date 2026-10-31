-- 31/10 (socio): DURG/SMOH de cada motor (horas desde la última recorrida general). Obligatorio en el formulario;
-- los motores que ya existían quedan con "-" para que editar esos avisos no dé error.
ALTER TABLE "AircraftEngine" ADD COLUMN IF NOT EXISTS "smoh" TEXT;
UPDATE "AircraftEngine" SET "smoh" = '-' WHERE "smoh" IS NULL OR btrim("smoh") = '';
