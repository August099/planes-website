-- VA-96 (socio, 17/10): "plane/planes/avion" pasa a "aircraft". La base ya usaba Aircraft* en tablas
-- y columnas: no hay RENAME. Solo se actualizan datos guardados con los nombres viejos.

-- 1) Íconos de categorías (AvionIcon → AircraftIcon, AvionAgricolaIcon → AgriculturalAircraftIcon).
UPDATE "Category" SET "icon" = 'AircraftIcon' WHERE "icon" = 'AvionIcon';
UPDATE "Category" SET "icon" = 'AgriculturalAircraftIcon' WHERE "icon" = 'AvionAgricolaIcon';

-- 2) Links internos de las guías: /planes/plane-details/<id> → /aircraft/<id>, /planes/compare →
--    /aircraft/compare y /planes → /aircraft (las URLs viejas igual redirigen con 308).
UPDATE "Guide" SET
  "sections" = regexp_replace(regexp_replace(regexp_replace("sections"::text, '/planes/plane-details/', '/aircraft/', 'g'), '/planes/compare', '/aircraft/compare', 'g'), '/planes(?=["?#/])', '/aircraft', 'g')::jsonb,
  "cta"      = regexp_replace(regexp_replace(regexp_replace("cta"::text, '/planes/plane-details/', '/aircraft/', 'g'), '/planes/compare', '/aircraft/compare', 'g'), '/planes(?=["?#/])', '/aircraft', 'g')::jsonb,
  "source"   = CASE WHEN "source" IS NULL THEN NULL ELSE regexp_replace(regexp_replace(regexp_replace("source"::text, '/planes/plane-details/', '/aircraft/', 'g'), '/planes/compare', '/aircraft/compare', 'g'), '/planes(?=["?#/])', '/aircraft', 'g')::jsonb END
WHERE "sections"::text LIKE '%/planes%' OR "cta"::text LIKE '%/planes%' OR COALESCE("source"::text, '') LIKE '%/planes%';
