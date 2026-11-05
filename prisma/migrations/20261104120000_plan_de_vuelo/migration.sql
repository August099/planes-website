-- VA-191: plan de vuelo. Datos aeronáuticos, perfiles de aeronave, planes guardados y su límite por plan.
CREATE TYPE "AeroDataset" AS ENUM ('MADHEL','LAD','NAVAID','AIRSPACE');
CREATE TYPE "AeroImportStatus" AS ENUM ('PENDING','APPLIED','REJECTED','FAILED');
CREATE TYPE "AeroPlaceKind" AS ENUM ('AD','HELIPORT','LAD','LADH');
CREATE TYPE "AirspaceKind" AS ENUM ('TMA','CTR','ATZ','PROHIBITED','RESTRICTED','DANGEROUS','ADIZ','FIR');

CREATE TABLE "AeroImport" (
  "id" TEXT PRIMARY KEY,
  "dataset" "AeroDataset" NOT NULL,
  "status" "AeroImportStatus" NOT NULL DEFAULT 'PENDING',
  "sourceUrl" TEXT,
  "sourceDate" TIMESTAMP(3),
  "added" INTEGER NOT NULL DEFAULT 0,
  "changed" INTEGER NOT NULL DEFAULT 0,
  "removed" INTEGER NOT NULL DEFAULT 0,
  "diff" JSONB NOT NULL DEFAULT '{}',
  "payload" JSONB,
  "warnings" JSONB NOT NULL DEFAULT '[]',
  "error" TEXT,
  "appliedAt" TIMESTAMP(3),
  "appliedById" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AeroImport_dataset_status_idx" ON "AeroImport"("dataset","status");

CREATE TABLE "AeroPlace" (
  "id" TEXT PRIMARY KEY,
  "kind" "AeroPlaceKind" NOT NULL,
  "source" "AeroDataset" NOT NULL,
  "code" TEXT NOT NULL,
  "icao" TEXT,
  "iata" TEXT,
  "name" TEXT NOT NULL,
  "fir" TEXT,
  "province" TEXT,
  "location" TEXT,
  "lat" DOUBLE PRECISION,
  "lng" DOUBLE PRECISION,
  "elevationM" INTEGER,
  "condition" TEXT,
  "runways" JSONB NOT NULL DEFAULT '[]',
  "frequencies" JSONB NOT NULL DEFAULT '[]',
  "details" JSONB NOT NULL DEFAULT '{}',
  "sourceUpdatedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "AeroPlace_source_code_key" ON "AeroPlace"("source","code");
CREATE INDEX "AeroPlace_icao_idx" ON "AeroPlace"("icao");
CREATE INDEX "AeroPlace_kind_idx" ON "AeroPlace"("kind");

CREATE TABLE "Navaid" (
  "id" TEXT PRIMARY KEY,
  "ident" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "frequency" TEXT,
  "lat" DOUBLE PRECISION NOT NULL,
  "lng" DOUBLE PRECISION NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "Navaid_ident_type_key" ON "Navaid"("ident","type");

CREATE TABLE "Airspace" (
  "id" TEXT PRIMARY KEY,
  "kind" "AirspaceKind" NOT NULL,
  "name" TEXT NOT NULL,
  "lowerLimit" TEXT,
  "upperLimit" TEXT,
  "geometry" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "Airspace_kind_idx" ON "Airspace"("kind");

CREATE TABLE "AircraftProfile" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "name" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "AircraftProfile_userId_idx" ON "AircraftProfile"("userId");

CREATE TABLE "FlightPlan" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "name" TEXT NOT NULL,
  "origin" TEXT,
  "destination" TEXT,
  "departureAt" TIMESTAMP(3),
  "data" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "FlightPlan_userId_updatedAt_idx" ON "FlightPlan"("userId","updatedAt");

-- NULL = sin límite. Base 2 (planes y perfiles suman juntos); Pro y Broker sin límite. Los admins no dependen de esta fila.
ALTER TABLE "Plan" ADD COLUMN "flightPlansLimit" INTEGER DEFAULT 2;
UPDATE "Plan" SET "flightPlansLimit" = NULL WHERE "tier" IN ('PRO','BUSINESS');

INSERT INTO "PlanGridRow" ("id","label","sortOrder","systemKey","cells","updatedAt")
SELECT 'grid-flight-plans','Planes de vuelo guardados',
       COALESCE((SELECT MAX("sortOrder") FROM "PlanGridRow"),0)+1,'flightPlans','{}',now()
WHERE NOT EXISTS (SELECT 1 FROM "PlanGridRow" WHERE "systemKey"='flightPlans');
