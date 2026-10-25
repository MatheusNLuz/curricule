-- AlterTable
ALTER TABLE "Analysis" ADD COLUMN     "clientRequestId" TEXT,
ADD COLUMN     "draftJson" TEXT,
ADD COLUMN     "editorDraftJson" TEXT,
ADD COLUMN     "finalAssessmentJson" TEXT,
ADD COLUMN     "jobUrl" TEXT,
ADD COLUMN     "profileUrl" TEXT,
ADD COLUMN     "revision" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ResumeRevision" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResumeRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisTask" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "leaseUntil" TIMESTAMP(3) NOT NULL,
    "resultJson" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalysisTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisUsage" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalysisUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResumeRevision_analysisId_createdAt_idx" ON "ResumeRevision"("analysisId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AnalysisTask_analysisId_kind_key" ON "AnalysisTask"("analysisId", "kind");

-- CreateIndex
CREATE INDEX "AnalysisUsage_userId_createdAt_idx" ON "AnalysisUsage"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Analysis_clientRequestId_key" ON "Analysis"("clientRequestId");

-- CreateIndex
CREATE INDEX "Analysis_userId_createdAt_id_idx" ON "Analysis"("userId", "createdAt", "id");

-- AddForeignKey
ALTER TABLE "ResumeRevision" ADD CONSTRAINT "ResumeRevision_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisTask" ADD CONSTRAINT "AnalysisTask_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisUsage" ADD CONSTRAINT "AnalysisUsage_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisUsage" ADD CONSTRAINT "AnalysisUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
