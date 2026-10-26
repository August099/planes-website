-- VA-169: secciones de la Página VA completa (Broker y admins).
-- CreateTable
CREATE TABLE "ProfilePage" (
    "userId" TEXT NOT NULL,
    "sections" JSONB NOT NULL DEFAULT '[]',
    "draftSections" JSONB,
    "publishedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProfilePage_pkey" PRIMARY KEY ("userId")
);
-- AddForeignKey
ALTER TABLE "ProfilePage" ADD CONSTRAINT "ProfilePage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
