-- Rename scoring-era enum values to enrichment terminology.
ALTER TYPE "SearchJobStatus" RENAME VALUE 'SCORING' TO 'ENRICHING';
ALTER TYPE "SearchResultStage" RENAME VALUE 'SCORING' TO 'ENRICHING';
ALTER TYPE "SearchResultStage" RENAME VALUE 'SCORE_FAILED' TO 'ENRICH_FAILED';
ALTER TYPE "SearchResultStage" RENAME VALUE 'SCORED' TO 'ENRICHED';
