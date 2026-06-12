-- Composite index for content-hash dedup lookups (companyId + contentHash);
-- replaces the standalone contentHash index which served no other query.
CREATE INDEX "company_profiles_companyId_contentHash_idx" ON "company_profiles"("companyId", "contentHash");

DROP INDEX IF EXISTS "company_profiles_contentHash_idx";

-- Stale-job sweep filters on status + updatedAt.
CREATE INDEX "search_jobs_status_updatedAt_idx" ON "search_jobs"("status", "updatedAt");
