-- 27/10: aceptación de términos. Se pide también a quien entra con Google o Facebook.
ALTER TABLE "User" ADD COLUMN "termsAcceptedAt" TIMESTAMP(3);

-- Los que se registraron con el formulario ya los aceptaron (el checkbox es obligatorio).
UPDATE "User" SET "termsAcceptedAt" = "createdAt" WHERE "passwordHash" IS NOT NULL;
