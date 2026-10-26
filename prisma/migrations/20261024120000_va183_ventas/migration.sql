-- VA-183: datos de la venta al marcar un aviso como vendido.
ALTER TABLE "Aircraft" ADD COLUMN     "soldArsPerUsd" DECIMAL(12,2),
ADD COLUMN     "soldAt" TIMESTAMP(3),
ADD COLUMN     "soldCurrency" "ListingCurrency",
ADD COLUMN     "soldPrice" DECIMAL(12,2),
ADD COLUMN     "soldPriceDeclared" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "soldViaVA" BOOLEAN;

ALTER TABLE "SparePart" ADD COLUMN     "soldArsPerUsd" DECIMAL(12,2),
ADD COLUMN     "soldAt" TIMESTAMP(3),
ADD COLUMN     "soldCurrency" "ListingCurrency",
ADD COLUMN     "soldPrice" DECIMAL(12,2),
ADD COLUMN     "soldPriceDeclared" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "soldViaVA" BOOLEAN;

CREATE INDEX "Aircraft_status_soldAt_idx" ON "Aircraft"("status", "soldAt");
CREATE INDEX "SparePart_status_soldAt_idx" ON "SparePart"("status", "soldAt");

-- Los ya vendidos: fecha = última modificación y el precio publicado (sin respuesta ni cotización).
UPDATE "Aircraft" SET "soldAt" = "updatedAt", "soldPrice" = "price", "soldCurrency" = 'USD'
WHERE "status" = 'SOLD' AND "soldAt" IS NULL;
UPDATE "SparePart" SET "soldAt" = "updatedAt", "soldPrice" = "price",
  "soldCurrency" = CASE WHEN "inPesos" THEN 'ARS'::"ListingCurrency" ELSE 'USD'::"ListingCurrency" END
WHERE "status" = 'SOLD' AND "soldAt" IS NULL;
