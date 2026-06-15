-- CreateTable
CREATE TABLE "saved_leads" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "searchResultId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "savedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "saved_leads_userId_searchResultId_key" ON "saved_leads"("userId", "searchResultId");

-- CreateIndex
CREATE INDEX "saved_leads_userId_savedAt_idx" ON "saved_leads"("userId", "savedAt" DESC);

-- AddForeignKey
ALTER TABLE "saved_leads" ADD CONSTRAINT "saved_leads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_leads" ADD CONSTRAINT "saved_leads_searchResultId_fkey" FOREIGN KEY ("searchResultId") REFERENCES "search_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_leads" ADD CONSTRAINT "saved_leads_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
