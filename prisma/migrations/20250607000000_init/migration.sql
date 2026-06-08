-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "SearchJobStatus" AS ENUM ('PENDING', 'DISCOVERING', 'CRAWLING', 'EXTRACTING', 'SCORING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SearchResultStage" AS ENUM ('DISCOVERED', 'CRAWLING', 'CRAWL_FAILED', 'CRAWLED', 'EXTRACTING', 'EXTRACT_FAILED', 'EXTRACTED', 'SCORING', 'SCORE_FAILED', 'SCORED');

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "domain" VARCHAR(253) NOT NULL,
    "normalizedDomain" VARCHAR(253) NOT NULL,
    "name" VARCHAR(500),
    "websiteUrl" VARCHAR(2048),
    "firstSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCrawledAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_profiles" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "structuredData" JSONB NOT NULL,
    "completeness" DECIMAL(4,3),
    "modelUsed" VARCHAR(100),
    "promptVersion" VARCHAR(50),
    "contentHash" VARCHAR(64),
    "extractedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "company_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_jobs" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "query" TEXT NOT NULL,
    "criteria" JSONB NOT NULL DEFAULT '{}',
    "status" "SearchJobStatus" NOT NULL DEFAULT 'PENDING',
    "companyLimit" INTEGER NOT NULL DEFAULT 25,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "search_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_results" (
    "id" UUID NOT NULL,
    "searchJobId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "stage" "SearchResultStage" NOT NULL DEFAULT 'DISCOVERED',
    "rank" INTEGER,
    "discoverySource" VARCHAR(100),
    "discoveryUrl" VARCHAR(2048),
    "stageError" TEXT,
    "discoveredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "search_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_scores" (
    "id" UUID NOT NULL,
    "searchResultId" UUID NOT NULL,
    "searchJobId" UUID NOT NULL,
    "totalScore" DECIMAL(5,2) NOT NULL,
    "confidence" DECIMAL(4,3) NOT NULL,
    "breakdown" JSONB NOT NULL DEFAULT '{}',
    "rationale" TEXT NOT NULL,
    "modelUsed" VARCHAR(100),
    "promptVersion" VARCHAR(50),
    "scoredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "lead_scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_normalizedDomain_key" ON "companies"("normalizedDomain");

-- CreateIndex
CREATE INDEX "companies_lastCrawledAt_idx" ON "companies"("lastCrawledAt");

-- CreateIndex
CREATE INDEX "companies_name_idx" ON "companies"("name");

-- CreateIndex
CREATE INDEX "company_profiles_companyId_extractedAt_idx" ON "company_profiles"("companyId", "extractedAt" DESC);

-- CreateIndex
CREATE INDEX "company_profiles_contentHash_idx" ON "company_profiles"("contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "company_profiles_companyId_version_key" ON "company_profiles"("companyId", "version");

-- CreateIndex
CREATE INDEX "search_jobs_userId_createdAt_idx" ON "search_jobs"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "search_jobs_status_createdAt_idx" ON "search_jobs"("status", "createdAt");

-- CreateIndex
CREATE INDEX "search_results_searchJobId_stage_idx" ON "search_results"("searchJobId", "stage");

-- CreateIndex
CREATE INDEX "search_results_searchJobId_rank_idx" ON "search_results"("searchJobId", "rank");

-- CreateIndex
CREATE INDEX "search_results_companyId_idx" ON "search_results"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "search_results_searchJobId_companyId_key" ON "search_results"("searchJobId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "lead_scores_searchResultId_key" ON "lead_scores"("searchResultId");

-- CreateIndex
CREATE INDEX "lead_scores_searchJobId_totalScore_idx" ON "lead_scores"("searchJobId", "totalScore" DESC);

-- CreateIndex
CREATE INDEX "lead_scores_searchJobId_confidence_idx" ON "lead_scores"("searchJobId", "confidence" DESC);

-- AddForeignKey
ALTER TABLE "company_profiles" ADD CONSTRAINT "company_profiles_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_results" ADD CONSTRAINT "search_results_searchJobId_fkey" FOREIGN KEY ("searchJobId") REFERENCES "search_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_results" ADD CONSTRAINT "search_results_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_scores" ADD CONSTRAINT "lead_scores_searchResultId_fkey" FOREIGN KEY ("searchResultId") REFERENCES "search_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_scores" ADD CONSTRAINT "lead_scores_searchJobId_fkey" FOREIGN KEY ("searchJobId") REFERENCES "search_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
