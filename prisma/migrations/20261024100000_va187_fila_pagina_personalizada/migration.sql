-- VA-187: la fila "Branding" de la grilla de planes pasa a llamarse "Página personalizada" (solo datos).
-- Si el admin ya le cambió el nombre, no se toca.
UPDATE "PlanGridRow" SET "label" = 'Página personalizada', "updatedAt" = CURRENT_TIMESTAMP
WHERE "systemKey" = 'branding' AND "label" = 'Branding';
