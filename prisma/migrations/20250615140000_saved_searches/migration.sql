-- DropTable
DROP TABLE IF EXISTS "saved_leads";

-- CreateTable
CREATE TABLE "saved_searches" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "searchJobId" UUID NOT NULL,
    "savedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "saved_searches_userId_searchJobId_key" ON "saved_searches"("userId", "searchJobId");

-- CreateIndex
CREATE INDEX "saved_searches_userId_savedAt_idx" ON "saved_searches"("userId", "savedAt" DESC);

-- AddForeignKey
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_searchJobId_fkey" FOREIGN KEY ("searchJobId") REFERENCES "search_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
