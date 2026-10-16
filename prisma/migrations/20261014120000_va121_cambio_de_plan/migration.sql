-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "pendingMpSubscriptionId" TEXT,
ADD COLUMN     "pendingPlanId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_pendingMpSubscriptionId_key" ON "Subscription"("pendingMpSubscriptionId");

