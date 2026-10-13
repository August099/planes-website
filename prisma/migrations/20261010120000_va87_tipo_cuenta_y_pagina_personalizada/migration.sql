-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "includesCustomPage" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "businessName" TEXT,
ADD COLUMN     "coverUrl" TEXT,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "userTypeConfirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "website" TEXT,
ADD COLUMN     "whatsapp" TEXT;


-- Datos: quien se registró con email y contraseña ya eligió su tipo de cuenta en /register.
UPDATE "User" SET "userTypeConfirmed" = true WHERE "passwordHash" IS NOT NULL;
