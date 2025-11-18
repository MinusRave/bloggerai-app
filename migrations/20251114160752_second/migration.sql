-- AlterTable
ALTER TABLE "CalendarPost" ADD COLUMN     "externalLinkSuggestions" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "internalLinkSuggestions" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "EditorialProject" ADD COLUMN     "avoidCannibalization" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "firstPublishDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "mainSiteUrl" VARCHAR(2048);

-- CreateIndex
CREATE INDEX "EditorialProject_archivedAt_idx" ON "EditorialProject"("archivedAt");
