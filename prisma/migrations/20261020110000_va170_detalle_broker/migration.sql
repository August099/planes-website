-- VA-170: detalle de avisos de Brokers: portada de detalles, color de acento y video de YouTube.
-- AlterTable
ALTER TABLE "Aircraft" ADD COLUMN     "youtubeUrl" VARCHAR(100);
-- AlterTable
ALTER TABLE "SparePart" ADD COLUMN     "youtubeUrl" VARCHAR(100);
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accentColor" VARCHAR(16),
ADD COLUMN     "detailCoverUrl" TEXT;
