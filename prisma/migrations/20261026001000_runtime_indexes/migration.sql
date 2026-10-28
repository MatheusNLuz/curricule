CREATE INDEX "Analysis_userId_updatedAt_id_idx" ON "Analysis"("userId", "updatedAt", "id");
CREATE INDEX "AnalysisTask_userId_status_leaseUntil_idx" ON "AnalysisTask"("userId", "status", "leaseUntil");
CREATE INDEX "AnalysisTask_status_leaseUntil_idx" ON "AnalysisTask"("status", "leaseUntil");
