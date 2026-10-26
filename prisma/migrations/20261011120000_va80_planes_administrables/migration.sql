-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "badge" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'ARS',
ADD COLUMN     "description" TEXT,
ADD COLUMN     "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "isPopular" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "noExpiry" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "showInAircraftTab" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "showInPartsTab" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;


-- VA-80: los planes que hoy están escritos en /plans pasan a la base, con los mismos textos y
-- precios. Los "Plan 1 Avión" y "Plan 1 Repuesto" no van acá: son el precio por aviso de VA-59.
INSERT INTO "Plan" (
  "id", "name", "type", "price", "billingType", "billingInterval",
  "aircraftListingsCount", "sparePartsListingsCount", "isUnlimitedAircraft", "isUnlimitedSpareParts",
  "includesVerifiedBadge", "usageDescription", "description", "features", "badge", "isPopular",
  "showInAircraftTab", "showInPartsTab", "sortOrder", "isActive"
) VALUES
  ('plan-aircraft-3', 'Plan 3 Aviones', 'AIRCRAFT_PACK', 72000, 'ONE_TIME', NULL,
   3, 0, false, false,
   false, '3 Posteos de Aeronaves',
   'Pensado para vendedores frecuentes, hangares o propietarios con varias unidades.',
   ARRAY['3 Posteos de Aeronaves independientes', 'Uso flexible de créditos (sin vencimiento)', 'Galería completa de fotos', 'Mayor visibilidad en el buscador', 'Soporte prioritario'],
   'Ahorrá 20%', true, true, false, 10, true),
  ('plan-aircraft-parts-unlimited', 'Aviones y Repuestos Ilimitados', 'SUBSCRIPTION', 180000, 'SUBSCRIPTION', 'MONTHLY',
   0, 0, true, true,
   true, 'Publicaciones Ilimitadas',
   'La solución integral para Brokers, Concesionarios y Flotas comerciales.',
   ARRAY['Publicación ilimitada de Aeronaves', 'Publicación ilimitada de Repuestos', 'Perfil con insignia de Vendedor Verificado', 'Ubicación destacada en búsquedas', 'Atención y soporte personalizado'],
   'Insignia Verificado', false, true, false, 20, true),
  ('plan-parts-5', 'Plan 5 Repuestos', 'SPARE_PART_PACK', 50000, 'ONE_TIME', NULL,
   0, 5, false, false,
   false, '5 Posteos de Repuestos',
   'Para mecánicos o pequeños talleres que renuevan stock de partes frecuentemente.',
   ARRAY['5 Posteos de Repuestos acumulables', 'Uso de créditos sin vencimiento', 'Galería de fotos por repuesto', 'Contacto directo por WhatsApp/Email'],
   'Ahorrá 33%', false, false, true, 10, true),
  ('plan-parts-unlimited', 'Repuestos Ilimitados', 'SUBSCRIPTION', 80000, 'SUBSCRIPTION', 'MONTHLY',
   0, 0, false, true,
   true, 'Repuestos Ilimitados',
   'Ideal para Talleres Aeronáuticos, Distribuidoras y Comercios de repuestos.',
   ARRAY['Publicación ilimitada de Repuestos y Accesorios', 'Insignia de Vendedor Verificado', 'Ubicación preferencial en el catálogo', 'Soporte para carga masiva de inventario'],
   'Insignia Verificado', true, false, true, 20, true),
  ('plan-pro', 'Aviones y Repuestos Ilimitados', 'SUBSCRIPTION', 250000, 'SUBSCRIPTION', 'MONTHLY',
   0, 0, true, true,
   true, 'Todo Ilimitado',
   'Acceso total para quienes venden tanto aeronaves como partes y herramientas.',
   ARRAY['Publicación ilimitada de Aeronaves', 'Publicación ilimitada de Repuestos', 'Insignia de Vendedor Verificado', 'Máxima prioridad en resultados'],
   'Plan Pro', false, false, true, 30, true)
ON CONFLICT ("id") DO NOTHING;
