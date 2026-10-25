-- VA-190: marcas y modelos cargados por usuarios ("Otra marca" / "Otro modelo"): cuándo, desde qué aviso,
-- y si el admin los ocultó.
ALTER TABLE "AircraftBrand" ADD COLUMN     "hidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourceAircraftId" TEXT,
ADD COLUMN     "userCreatedAt" TIMESTAMP(3);

ALTER TABLE "AircraftModel" ADD COLUMN     "hidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourceAircraftId" TEXT,
ADD COLUMN     "userCreatedAt" TIMESTAMP(3);
