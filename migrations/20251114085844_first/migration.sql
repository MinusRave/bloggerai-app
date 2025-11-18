-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'STRATEGY_READY', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ResearchType" AS ENUM ('KEYWORD_EXPANSION', 'COMPETITOR_ANALYSIS', 'TRENDING_TOPICS', 'SEARCH_VOLUME', 'CONTENT_GAP');

-- CreateEnum
CREATE TYPE "SearchIntent" AS ENUM ('INFORMATIONAL', 'NAVIGATIONAL', 'TRANSACTIONAL', 'COMMERCIAL');

-- CreateEnum
CREATE TYPE "ConfidenceLevel" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('PROPOSED', 'APPROVED', 'MODIFIED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email" TEXT,
    "username" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "paymentProcessorUserId" TEXT,
    "lemonSqueezyCustomerPortalUrl" TEXT,
    "subscriptionStatus" TEXT,
    "subscriptionPlan" TEXT,
    "datePaid" TIMESTAMP(3),
    "credits" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GptResponse" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,

    CONSTRAINT "GptResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "time" TEXT NOT NULL DEFAULT '1',
    "isDone" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "uploadUrl" TEXT NOT NULL,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyStats" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalViews" INTEGER NOT NULL DEFAULT 0,
    "prevDayViewsChangePercent" TEXT NOT NULL DEFAULT '0',
    "userCount" INTEGER NOT NULL DEFAULT 0,
    "paidUserCount" INTEGER NOT NULL DEFAULT 0,
    "userDelta" INTEGER NOT NULL DEFAULT 0,
    "paidUserDelta" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalProfit" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "DailyStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageViewSource" (
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dailyStatsId" INTEGER,
    "visitors" INTEGER NOT NULL,

    CONSTRAINT "PageViewSource_pkey" PRIMARY KEY ("date","name")
);

-- CreateTable
CREATE TABLE "Logs" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message" TEXT NOT NULL,
    "level" TEXT NOT NULL,

    CONSTRAINT "Logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactFormMessage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "repliedAt" TIMESTAMP(3),

    CONSTRAINT "ContactFormMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EditorialProject" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "language" VARCHAR(10) NOT NULL,
    "target" TEXT NOT NULL,
    "objectives" TEXT NOT NULL,
    "blogUrl" VARCHAR(2048),
    "competitorUrls" TEXT[],
    "keywordSeed" TEXT[],
    "knowledgeBase" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "EditorialProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategySession" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "StrategySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategyMessage" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "aiModel" VARCHAR(100),
    "tokenCount" INTEGER,
    "processingMs" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StrategyMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchResult" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "researchType" "ResearchType" NOT NULL,
    "query" VARCHAR(500),
    "targetUrls" TEXT[],
    "results" JSONB NOT NULL,
    "rationale" TEXT NOT NULL,
    "toolsUsed" TEXT[],
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentStrategy" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "globalRationale" TEXT NOT NULL,
    "identifiedGaps" TEXT NOT NULL,
    "coveragePeriodDays" INTEGER NOT NULL DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "activatedAt" TIMESTAMP(3),
    "replacedBy" INTEGER,
    "replacedAt" TIMESTAMP(3),
    "aiModel" VARCHAR(100) NOT NULL,
    "tokenCount" INTEGER,
    "processingMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentStrategy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThemePillar" (
    "id" SERIAL NOT NULL,
    "strategyId" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "rationale" TEXT NOT NULL,
    "focusKeywords" TEXT[],
    "orderIndex" INTEGER NOT NULL,
    "color" VARCHAR(7),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThemePillar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarPost" (
    "id" SERIAL NOT NULL,
    "strategyId" INTEGER NOT NULL,
    "pillarId" INTEGER NOT NULL,
    "publishDate" DATE NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "primaryKeyword" VARCHAR(255) NOT NULL,
    "secondaryKeywords" TEXT[],
    "searchIntent" "SearchIntent" NOT NULL,
    "rationale" TEXT NOT NULL,
    "confidenceLevel" "ConfidenceLevel" NOT NULL,
    "warningFlags" JSONB NOT NULL DEFAULT '[]',
    "status" "PostStatus" NOT NULL DEFAULT 'PROPOSED',
    "manuallyEdited" BOOLEAN NOT NULL DEFAULT false,
    "rejectionReason" TEXT,
    "aiModel" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "CalendarPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValidationResult" (
    "id" SERIAL NOT NULL,
    "postId" INTEGER NOT NULL,
    "isValid" BOOLEAN NOT NULL,
    "warnings" JSONB NOT NULL DEFAULT '[]',
    "confidenceLevel" "ConfidenceLevel" NOT NULL,
    "aiModel" VARCHAR(100) NOT NULL,
    "tokenCount" INTEGER,
    "processingMs" INTEGER,
    "kbSnapshot" TEXT NOT NULL,
    "validatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "wasRevalidated" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ValidationResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auth" (
    "id" TEXT NOT NULL,
    "userId" TEXT,

    CONSTRAINT "Auth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthIdentity" (
    "providerName" TEXT NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "providerData" TEXT NOT NULL DEFAULT '{}',
    "authId" TEXT NOT NULL,

    CONSTRAINT "AuthIdentity_pkey" PRIMARY KEY ("providerName","providerUserId")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_paymentProcessorUserId_key" ON "User"("paymentProcessorUserId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyStats_date_key" ON "DailyStats"("date");

-- CreateIndex
CREATE INDEX "EditorialProject_userId_status_idx" ON "EditorialProject"("userId", "status");

-- CreateIndex
CREATE INDEX "EditorialProject_createdAt_idx" ON "EditorialProject"("createdAt");

-- CreateIndex
CREATE INDEX "StrategySession_projectId_status_idx" ON "StrategySession"("projectId", "status");

-- CreateIndex
CREATE INDEX "StrategyMessage_sessionId_timestamp_idx" ON "StrategyMessage"("sessionId", "timestamp");

-- CreateIndex
CREATE INDEX "ResearchResult_sessionId_researchType_idx" ON "ResearchResult"("sessionId", "researchType");

-- CreateIndex
CREATE INDEX "ResearchResult_expiresAt_idx" ON "ResearchResult"("expiresAt");

-- CreateIndex
CREATE INDEX "ContentStrategy_sessionId_isActive_idx" ON "ContentStrategy"("sessionId", "isActive");

-- CreateIndex
CREATE INDEX "ContentStrategy_sessionId_createdAt_idx" ON "ContentStrategy"("sessionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContentStrategy_sessionId_versionNumber_key" ON "ContentStrategy"("sessionId", "versionNumber");

-- CreateIndex
CREATE INDEX "ThemePillar_strategyId_orderIndex_idx" ON "ThemePillar"("strategyId", "orderIndex");

-- CreateIndex
CREATE INDEX "CalendarPost_strategyId_publishDate_idx" ON "CalendarPost"("strategyId", "publishDate");

-- CreateIndex
CREATE INDEX "CalendarPost_pillarId_idx" ON "CalendarPost"("pillarId");

-- CreateIndex
CREATE INDEX "CalendarPost_status_idx" ON "CalendarPost"("status");

-- CreateIndex
CREATE INDEX "ValidationResult_postId_validatedAt_idx" ON "ValidationResult"("postId", "validatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Auth_userId_key" ON "Auth"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_id_key" ON "Session"("id");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- AddForeignKey
ALTER TABLE "GptResponse" ADD CONSTRAINT "GptResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageViewSource" ADD CONSTRAINT "PageViewSource_dailyStatsId_fkey" FOREIGN KEY ("dailyStatsId") REFERENCES "DailyStats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactFormMessage" ADD CONSTRAINT "ContactFormMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditorialProject" ADD CONSTRAINT "EditorialProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategySession" ADD CONSTRAINT "StrategySession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "EditorialProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategyMessage" ADD CONSTRAINT "StrategyMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StrategySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchResult" ADD CONSTRAINT "ResearchResult_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StrategySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentStrategy" ADD CONSTRAINT "ContentStrategy_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StrategySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentStrategy" ADD CONSTRAINT "ContentStrategy_replacedBy_fkey" FOREIGN KEY ("replacedBy") REFERENCES "ContentStrategy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThemePillar" ADD CONSTRAINT "ThemePillar_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "ContentStrategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarPost" ADD CONSTRAINT "CalendarPost_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "ContentStrategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarPost" ADD CONSTRAINT "CalendarPost_pillarId_fkey" FOREIGN KEY ("pillarId") REFERENCES "ThemePillar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidationResult" ADD CONSTRAINT "ValidationResult_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CalendarPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auth" ADD CONSTRAINT "Auth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthIdentity" ADD CONSTRAINT "AuthIdentity_authId_fkey" FOREIGN KEY ("authId") REFERENCES "Auth"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Auth"("id") ON DELETE CASCADE ON UPDATE CASCADE;
