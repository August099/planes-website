-- VA-84: precio por aviso de hangar, igual al de aviones (pedido del socio, 11/10). Se edita en /admin/prices.
-- Va en una migración aparte: el valor HANGAR del enum se agregó en la anterior.
INSERT INTO "ListingPrice" ("kind", "amount", "currency", "updatedAt")
SELECT 'HANGAR', "amount", "currency", CURRENT_TIMESTAMP FROM "ListingPrice" WHERE "kind" = 'AIRCRAFT'
ON CONFLICT ("kind") DO NOTHING;
