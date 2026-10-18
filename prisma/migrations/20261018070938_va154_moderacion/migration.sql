-- CreateEnum
CREATE TYPE "ModerationActionType" AS ENUM ('PAUSE', 'REVIEW_REQUESTED', 'REACTIVATE', 'KEEP_PAUSED');

-- AlterEnum
ALTER TYPE "AircraftStatus" ADD VALUE 'MODERATED';

-- AlterEnum
ALTER TYPE "SparePartStatus" ADD VALUE 'MODERATED';

-- CreateTable
CREATE TABLE "ModerationAction" (
    "id" TEXT NOT NULL,
    "listingKind" "ListingKind" NOT NULL,
    "listingId" TEXT NOT NULL,
    "action" "ModerationActionType" NOT NULL,
    "message" TEXT,
    "ownerId" TEXT NOT NULL,
    "adminId" TEXT,
    "reportId" TEXT,
    "ownerAcknowledgedAt" TIMESTAMP(3),
    "emailSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModerationAction_listingKind_listingId_createdAt_idx" ON "ModerationAction"("listingKind", "listingId", "createdAt");

-- CreateIndex
CREATE INDEX "ModerationAction_ownerId_ownerAcknowledgedAt_idx" ON "ModerationAction"("ownerId", "ownerAcknowledgedAt");

-- CreateIndex
CREATE INDEX "ModerationAction_action_createdAt_idx" ON "ModerationAction"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
