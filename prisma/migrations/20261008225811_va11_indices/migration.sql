-- DropIndex
DROP INDEX "Aircraft_status_idx";

-- DropIndex
DROP INDEX "SparePart_status_idx";

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Aircraft_status_listingExpiresAt_createdAt_idx" ON "Aircraft"("status", "listingExpiresAt", "createdAt");

-- CreateIndex
CREATE INDEX "Aircraft_sellerId_idx" ON "Aircraft"("sellerId");

-- CreateIndex
CREATE INDEX "Aircraft_categoryId_idx" ON "Aircraft"("categoryId");

-- CreateIndex
CREATE INDEX "AircraftDocument_aircraftId_idx" ON "AircraftDocument"("aircraftId");

-- CreateIndex
CREATE INDEX "AircraftEngine_aircraftId_idx" ON "AircraftEngine"("aircraftId");

-- CreateIndex
CREATE INDEX "AircraftImage_aircraftId_order_idx" ON "AircraftImage"("aircraftId", "order");

-- CreateIndex
CREATE INDEX "AircraftPropeller_aircraftId_idx" ON "AircraftPropeller"("aircraftId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_createdAt_idx" ON "AnalyticsEvent"("createdAt");

-- CreateIndex
CREATE INDEX "CouponUsage_userId_idx" ON "CouponUsage"("userId");

-- CreateIndex
CREATE INDEX "Lead_aircraftId_idx" ON "Lead"("aircraftId");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "SparePart_status_inPesos_createdAt_idx" ON "SparePart"("status", "inPesos", "createdAt");

-- CreateIndex
CREATE INDEX "SparePart_sellerId_idx" ON "SparePart"("sellerId");

-- CreateIndex
CREATE INDEX "SparePart_categoryId_idx" ON "SparePart"("categoryId");

-- CreateIndex
CREATE INDEX "SparePartImage_sparePartId_order_idx" ON "SparePartImage"("sparePartId", "order");

-- CreateIndex
CREATE INDEX "SparePartLead_sparePartId_idx" ON "SparePartLead"("sparePartId");
