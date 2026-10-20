-- VA-166: planes Base, Pro y Broker según la grilla de los socios (19/10). Montos y beneficios de Pro y
-- Broker los carga scripts/va166-migrate-data.ts (informe / --apply); acá van la estructura, el plan Base
-- y las filas de la grilla.

-- Niveles nuevos
CREATE TYPE "VaPageLevel" AS ENUM ('NONE', 'BANNER', 'FULL');
CREATE TYPE "MetricsLevel" AS ENUM ('BASIC', 'PRO', 'FULL');

ALTER TABLE "Plan"
  ADD COLUMN "listPrice"             DECIMAL(12,2),
  ADD COLUMN "republishesPerYear"    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "republishAllEveryDays" INTEGER,
  ADD COLUMN "includesFeatured"      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "vaPageLevel"           "VaPageLevel" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "includesCustomDetail"  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "metricsLevel"          "MetricsLevel" NOT NULL DEFAULT 'BASIC';

-- Lo que había pasa a los niveles nuevos y se quitan las columnas viejas
UPDATE "Plan" SET
  "vaPageLevel"  = CASE WHEN tier = 'BUSINESS' THEN 'FULL'::"VaPageLevel" WHEN "includesCustomPage" THEN 'BANNER'::"VaPageLevel" ELSE 'NONE'::"VaPageLevel" END,
  "metricsLevel" = CASE WHEN tier = 'BUSINESS' THEN 'FULL'::"MetricsLevel" WHEN "includesSellerMetrics" THEN 'PRO'::"MetricsLevel" ELSE 'BASIC'::"MetricsLevel" END;
ALTER TABLE "Plan" DROP COLUMN "includesCustomPage", DROP COLUMN "includesSellerMetrics";

-- El cupo gratis pasa al plan Base (1 avión / 3 repuestos, 2 republicaciones por año; decisión del 19/10).
INSERT INTO "Plan" ("id", "name", "type", "tier", "price", "aircraftListingsCount", "sparePartsListingsCount",
  "republishesPerYear", "billingType", "billingInterval", "isActive", "metricsLevel", "vaPageLevel", "sortOrder", "updatedAt")
VALUES ('plan-base', 'Base', 'SUBSCRIPTION', 'BASE', 0, 1, 3, 2, 'SUBSCRIPTION', 'MONTHLY', true, 'BASIC', 'NONE', 0, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "QuotaSettings"
  ADD COLUMN "republishCooldownDays" INTEGER NOT NULL DEFAULT 7,
  DROP COLUMN "freeAircraftQuota",
  DROP COLUMN "freeSparePartQuota";

-- Filas de la grilla de /plans (y del admin)
CREATE TABLE "PlanGridRow" (
  "id"        TEXT NOT NULL,
  "label"     TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "systemKey" TEXT,
  "cells"     JSONB NOT NULL DEFAULT '{}',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlanGridRow_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlanGridRow_systemKey_key" ON "PlanGridRow"("systemKey");

-- Las filas de la imagen "Composición de VA" (19/10). Las de sistema toman su valor de Plan.
INSERT INTO "PlanGridRow" ("id", "label", "sortOrder", "systemKey", "cells", "updatedAt") VALUES
  ('grid-aircraft',  'Publicaciones de aeronaves activas',  10, 'aircraft',  '{}', CURRENT_TIMESTAMP),
  ('grid-parts',     'Publicaciones de repuestos activas',  20, 'parts',     '{}', CURRENT_TIMESTAMP),
  ('grid-total',     'Máx. publicaciones al mismo tiempo',  30, 'total',     '{}', CURRENT_TIMESTAMP),
  ('grid-republish', 'Republicaciones',                     40, 'republish', '{}', CURRENT_TIMESTAMP),
  ('grid-metrics',   'Métricas de las publicaciones',       50, 'metrics',   '{}', CURRENT_TIMESTAMP),
  ('grid-edit',      'Edición libre de publicaciones',      60, NULL, '{"BASE":{"kind":"yes"},"PRO":{"kind":"yes"},"BROKER":{"kind":"yes"}}', CURRENT_TIMESTAMP),
  ('grid-contact',   'Contacto del vendedor',               70, NULL, '{"BASE":{"kind":"yes"},"PRO":{"kind":"yes"},"BROKER":{"kind":"yes"}}', CURRENT_TIMESTAMP),
  ('grid-verified',  'Usuario verificado',                  80, 'verified',  '{}', CURRENT_TIMESTAMP),
  ('grid-featured',  'Publicaciones destacadas',            90, 'featured',  '{}', CURRENT_TIMESTAMP),
  ('grid-branding',  'Branding',                           100, 'branding',  '{}', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
