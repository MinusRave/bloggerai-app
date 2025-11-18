/*
  Warnings:

  - You are about to drop the column `replacedAt` on the `ContentStrategy` table. All the data in the column will be lost.
  - You are about to drop the column `replacedBy` on the `ContentStrategy` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `ThemePillar` table. All the data in the column will be lost.
  - Made the column `color` on table `ThemePillar` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "ContentStrategy" DROP CONSTRAINT "ContentStrategy_replacedBy_fkey";

-- DropIndex
DROP INDEX "ContentStrategy_sessionId_createdAt_idx";

-- AlterTable
ALTER TABLE "ContentStrategy" DROP COLUMN "replacedAt",
DROP COLUMN "replacedBy",
ALTER COLUMN "aiModel" DROP NOT NULL;

-- AlterTable
ALTER TABLE "KeywordResearch" ADD COLUMN     "existingKeywordsCount" INTEGER,
ADD COLUMN     "ownContentAnalyzed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ownContentData" JSONB,
ADD COLUMN     "totalBlogPosts" INTEGER;

-- AlterTable
ALTER TABLE "ThemePillar" DROP COLUMN "createdAt",
ALTER COLUMN "color" SET NOT NULL,
ALTER COLUMN "color" SET DATA TYPE VARCHAR(20);
