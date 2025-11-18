-- CreateEnum
CREATE TYPE "ResearchStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'APPROVED');

-- CreateEnum
CREATE TYPE "FunnelStage" AS ENUM ('ToF', 'MoF', 'BoF');

-- CreateEnum
CREATE TYPE "DifficultyLevel" AS ENUM ('EASY', 'MEDIUM', 'HARD', 'VERY_HARD');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ProjectStatus" ADD VALUE 'RESEARCH_PENDING';
ALTER TYPE "ProjectStatus" ADD VALUE 'RESEARCH_READY';

-- AlterTable
ALTER TABLE "CalendarPost" ADD COLUMN     "keywordId" INTEGER;

-- CreateTable
CREATE TABLE "KeywordResearch" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "useFreeTool" BOOLEAN NOT NULL DEFAULT true,
    "usePremiumAPI" BOOLEAN NOT NULL DEFAULT false,
    "premiumProvider" VARCHAR(50),
    "status" "ResearchStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "totalKeywordsFound" INTEGER NOT NULL DEFAULT 0,
    "totalClustersFound" INTEGER NOT NULL DEFAULT 0,
    "aiSelectedCount" INTEGER NOT NULL DEFAULT 0,
    "userSelectedCount" INTEGER NOT NULL DEFAULT 0,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "aiModel" VARCHAR(100),
    "tokenCount" INTEGER,
    "processingMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KeywordResearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KeywordCluster" (
    "id" SERIAL NOT NULL,
    "researchId" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "totalKeywords" INTEGER NOT NULL DEFAULT 0,
    "avgDifficulty" DOUBLE PRECISION,
    "totalVolume" INTEGER,
    "priorityScore" DOUBLE PRECISION,
    "dominantFunnel" "FunnelStage",
    "dominantIntent" "SearchIntent",
    "isSelectedByAI" BOOLEAN NOT NULL DEFAULT false,
    "isSelectedByUser" BOOLEAN NOT NULL DEFAULT false,
    "aiRationale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KeywordCluster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Keyword" (
    "id" SERIAL NOT NULL,
    "clusterId" INTEGER NOT NULL,
    "keyword" VARCHAR(500) NOT NULL,
    "language" VARCHAR(10) NOT NULL,
    "freeVolume" VARCHAR(50),
    "freeDifficulty" "DifficultyLevel",
    "relativePopularity" DOUBLE PRECISION,
    "premiumVolume" INTEGER,
    "premiumDifficulty" DOUBLE PRECISION,
    "premiumCPC" DOUBLE PRECISION,
    "premiumCompetition" DOUBLE PRECISION,
    "searchIntent" "SearchIntent",
    "funnelStage" "FunnelStage",
    "hasFeaturedSnippet" BOOLEAN NOT NULL DEFAULT false,
    "hasPAA" BOOLEAN NOT NULL DEFAULT false,
    "hasVideoCarousel" BOOLEAN NOT NULL DEFAULT false,
    "hasImagePack" BOOLEAN NOT NULL DEFAULT false,
    "hasLocalPack" BOOLEAN NOT NULL DEFAULT false,
    "isInExistingContent" BOOLEAN NOT NULL DEFAULT false,
    "existingContentUrl" VARCHAR(2048),
    "isSelectedByAI" BOOLEAN NOT NULL DEFAULT false,
    "isSelectedByUser" BOOLEAN NOT NULL DEFAULT false,
    "aiRationale" TEXT,
    "source" VARCHAR(100),
    "sourceUrl" VARCHAR(2048),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Keyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAPIKey" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "apiKey" VARCHAR(500) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAPIKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KeywordResearch_projectId_idx" ON "KeywordResearch"("projectId");

-- CreateIndex
CREATE INDEX "KeywordResearch_status_idx" ON "KeywordResearch"("status");

-- CreateIndex
CREATE INDEX "KeywordResearch_isApproved_idx" ON "KeywordResearch"("isApproved");

-- CreateIndex
CREATE INDEX "KeywordCluster_researchId_idx" ON "KeywordCluster"("researchId");

-- CreateIndex
CREATE INDEX "KeywordCluster_isSelectedByAI_idx" ON "KeywordCluster"("isSelectedByAI");

-- CreateIndex
CREATE INDEX "KeywordCluster_isSelectedByUser_idx" ON "KeywordCluster"("isSelectedByUser");

-- CreateIndex
CREATE INDEX "KeywordCluster_priorityScore_idx" ON "KeywordCluster"("priorityScore");

-- CreateIndex
CREATE INDEX "Keyword_clusterId_idx" ON "Keyword"("clusterId");

-- CreateIndex
CREATE INDEX "Keyword_keyword_idx" ON "Keyword"("keyword");

-- CreateIndex
CREATE INDEX "Keyword_isSelectedByAI_idx" ON "Keyword"("isSelectedByAI");

-- CreateIndex
CREATE INDEX "Keyword_isSelectedByUser_idx" ON "Keyword"("isSelectedByUser");

-- CreateIndex
CREATE UNIQUE INDEX "Keyword_clusterId_keyword_key" ON "Keyword"("clusterId", "keyword");

-- CreateIndex
CREATE INDEX "UserAPIKey_userId_idx" ON "UserAPIKey"("userId");

-- CreateIndex
CREATE INDEX "UserAPIKey_isActive_idx" ON "UserAPIKey"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "UserAPIKey_userId_provider_key" ON "UserAPIKey"("userId", "provider");

-- CreateIndex
CREATE INDEX "CalendarPost_keywordId_idx" ON "CalendarPost"("keywordId");

-- AddForeignKey
ALTER TABLE "CalendarPost" ADD CONSTRAINT "CalendarPost_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "Keyword"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeywordResearch" ADD CONSTRAINT "KeywordResearch_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "EditorialProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeywordCluster" ADD CONSTRAINT "KeywordCluster_researchId_fkey" FOREIGN KEY ("researchId") REFERENCES "KeywordResearch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Keyword" ADD CONSTRAINT "Keyword_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "KeywordCluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAPIKey" ADD CONSTRAINT "UserAPIKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
