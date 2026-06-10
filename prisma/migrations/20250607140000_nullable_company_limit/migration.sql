-- Allow searches without a company cap (null = discover all matching companies).
ALTER TABLE "search_jobs" ALTER COLUMN "companyLimit" DROP NOT NULL;
ALTER TABLE "search_jobs" ALTER COLUMN "companyLimit" DROP DEFAULT;
