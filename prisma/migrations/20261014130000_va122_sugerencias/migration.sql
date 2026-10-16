-- CreateTable
CREATE TABLE "Suggestion" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "userId" TEXT,
    "handledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Suggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Suggestion_createdAt_idx" ON "Suggestion"("createdAt");

