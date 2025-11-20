-- AlterTable
ALTER TABLE "EditorialProject" ADD COLUMN     "siteAnalysisData" JSONB,
ADD COLUMN     "siteAnalyzedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "KeywordResearch" ADD COLUMN     "aiGeneratedSeeds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "totalSeedsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "userProvidedSeeds" TEXT[] DEFAULT ARRAY[]::TEXT[];
