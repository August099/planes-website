-- CreateEnum
CREATE TYPE "GuideAudience" AS ENUM ('comprador', 'vendedor', 'todos');

-- CreateEnum
CREATE TYPE "GuideStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "Guide" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "audience" "GuideAudience" NOT NULL,
    "icon" TEXT NOT NULL,
    "metaDescription" TEXT NOT NULL,
    "sections" JSONB NOT NULL,
    "source" JSONB,
    "cta" JSONB NOT NULL DEFAULT '[]',
    "isGlossary" BOOLEAN NOT NULL DEFAULT false,
    "status" "GuideStatus" NOT NULL DEFAULT 'DRAFT',
    "order" INTEGER NOT NULL DEFAULT 0,
    "reviewedBy" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guide_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Guide_slug_key" ON "Guide"("slug");

-- CreateIndex
CREATE INDEX "Guide_status_order_idx" ON "Guide"("status", "order");
