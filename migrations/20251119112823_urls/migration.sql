-- AlterTable
ALTER TABLE "EditorialProject" ADD COLUMN     "keywordResearchUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "usePremiumKeywords" BOOLEAN NOT NULL DEFAULT false;
