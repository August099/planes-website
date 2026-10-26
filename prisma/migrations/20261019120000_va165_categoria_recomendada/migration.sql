-- VA-165: la categoría del modelo pasa a ser "recomendada" (se renombra, no se pierde lo cargado).
ALTER TABLE "AircraftModel" RENAME COLUMN "defaultCategoryId" TO "recommendedCategoryId";
ALTER TABLE "AircraftModel" RENAME CONSTRAINT "AircraftModel_defaultCategoryId_fkey" TO "AircraftModel_recommendedCategoryId_fkey";
