-- VA-158: se quitan los Miembros Fundadores (decisión de los socios, 18/10). 6 cuentas lo tenían en va_dev.
-- AlterTable
ALTER TABLE "User" DROP COLUMN "isFoundingMember";
