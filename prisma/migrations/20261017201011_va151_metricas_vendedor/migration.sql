-- AlterEnum
ALTER TYPE "AnalyticsEventType" ADD VALUE 'PROFILE_VIEW';

-- AlterTable
ALTER TABLE "AnalyticsEvent" ADD COLUMN     "profileUserId" TEXT;

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "includesSellerMetrics" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "AnalyticsEvent_profileUserId_eventType_createdAt_idx" ON "AnalyticsEvent"("profileUserId", "eventType", "createdAt");

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_profileUserId_fkey" FOREIGN KEY ("profileUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- VA-151: prendido en la Suscripción VA.
UPDATE "Plan" SET "includesSellerMetrics" = true WHERE "name" = 'Suscripción VA';
