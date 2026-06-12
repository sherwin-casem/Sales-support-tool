-- Parijat platform: auth, intent, outreach, campaigns, refresh

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'SALES_REP');
CREATE TYPE "IntentSignalType" AS ENUM ('HIRING', 'FUNDING', 'EXPANSION', 'PRODUCT_LAUNCH', 'OTHER');
CREATE TYPE "OutreachChannel" AS ENUM ('EMAIL', 'WHATSAPP', 'LINKEDIN');
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED');
CREATE TYPE "RecipientStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'REPLIED', 'BOUNCED', 'FAILED', 'UNSUBSCRIBED');

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "servicesCatalog" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'SALES_REP',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- Seed Parijat org + admin before FK (password: parijat-admin)
INSERT INTO "organizations" ("id", "name", "slug", "servicesCatalog", "createdAt", "updatedAt")
VALUES (
  '00000000-0000-4000-8000-000000000010',
  'Parijat',
  'parijat',
  '[{"name":"Custom Software Development","description":"End-to-end product engineering for web, mobile, and cloud-native applications.","valueProps":["Dedicated agile teams with senior engineers","Faster time-to-market with proven delivery frameworks","Scalable architecture aligned to business goals"],"targetIndustries":["SaaS","Fintech","Healthcare","E-commerce"]}]'::jsonb,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

INSERT INTO "users" ("id", "organizationId", "email", "passwordHash", "name", "role", "isActive", "createdAt", "updatedAt")
VALUES (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000010',
  'admin@parijat.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G2oX7qJ9mR5oGi',
  'Parijat Admin',
  'ADMIN',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- AlterTable companies
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "intentScore" DECIMAL(4,3);
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "intentUpdatedAt" TIMESTAMPTZ(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "companies_intentScore_idx" ON "companies"("intentScore");

-- CreateTable intent_signals
CREATE TABLE "intent_signals" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "type" "IntentSignalType" NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "summary" TEXT NOT NULL,
    "sourceUrl" VARCHAR(2048),
    "confidence" DECIMAL(3,2) NOT NULL,
    "detectedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3),

    CONSTRAINT "intent_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable outreach_messages
CREATE TABLE "outreach_messages" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "searchResultId" UUID,
    "channel" "OutreachChannel" NOT NULL DEFAULT 'EMAIL',
    "subject" VARCHAR(500) NOT NULL,
    "bodyText" TEXT NOT NULL,
    "bodyHtml" TEXT,
    "tone" VARCHAR(50),
    "promptVersion" VARCHAR(50) NOT NULL,
    "modelUsed" VARCHAR(100) NOT NULL,
    "parijatServices" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outreach_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable campaigns
CREATE TABLE "campaigns" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "subject" VARCHAR(500) NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "scheduledAt" TIMESTAMPTZ(3),
    "startedAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable campaign_recipients
CREATE TABLE "campaign_recipients" (
    "id" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "searchResultId" UUID,
    "toEmail" VARCHAR(320) NOT NULL,
    "toName" VARCHAR(200),
    "status" "RecipientStatus" NOT NULL DEFAULT 'PENDING',
    "providerId" VARCHAR(200),
    "sentAt" TIMESTAMPTZ(3),
    "deliveredAt" TIMESTAMPTZ(3),
    "openedAt" TIMESTAMPTZ(3),
    "clickedAt" TIMESTAMPTZ(3),
    "repliedAt" TIMESTAMPTZ(3),
    "bouncedAt" TIMESTAMPTZ(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "campaign_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable lead_refresh_schedules
CREATE TABLE "lead_refresh_schedules" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "intervalDays" INTEGER NOT NULL DEFAULT 30,
    "nextRunAt" TIMESTAMPTZ(3) NOT NULL,
    "lastRunAt" TIMESTAMPTZ(3),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "lead_refresh_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");
CREATE INDEX "intent_signals_companyId_detectedAt_idx" ON "intent_signals"("companyId", "detectedAt" DESC);
CREATE INDEX "outreach_messages_userId_createdAt_idx" ON "outreach_messages"("userId", "createdAt" DESC);
CREATE INDEX "outreach_messages_companyId_createdAt_idx" ON "outreach_messages"("companyId", "createdAt" DESC);
CREATE INDEX "campaigns_userId_createdAt_idx" ON "campaigns"("userId", "createdAt" DESC);
CREATE INDEX "campaigns_organizationId_status_idx" ON "campaigns"("organizationId", "status");
CREATE UNIQUE INDEX "campaign_recipients_campaignId_toEmail_key" ON "campaign_recipients"("campaignId", "toEmail");
CREATE INDEX "campaign_recipients_campaignId_status_idx" ON "campaign_recipients"("campaignId", "status");
CREATE UNIQUE INDEX "lead_refresh_schedules_userId_companyId_key" ON "lead_refresh_schedules"("userId", "companyId");
CREATE INDEX "lead_refresh_schedules_enabled_nextRunAt_idx" ON "lead_refresh_schedules"("enabled", "nextRunAt");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Ensure all search job user IDs exist before FK
INSERT INTO "users" ("id", "organizationId", "email", "passwordHash", "name", "role", "isActive", "createdAt", "updatedAt")
SELECT DISTINCT sj."userId", '00000000-0000-4000-8000-000000000010', sj."userId"::text || '@legacy.local', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G2oX7qJ9mR5oGi', 'Legacy User', 'SALES_REP', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "search_jobs" sj
WHERE NOT EXISTS (SELECT 1 FROM "users" u WHERE u."id" = sj."userId")
ON CONFLICT ("email") DO NOTHING;

ALTER TABLE "search_jobs" ADD CONSTRAINT "search_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "intent_signals" ADD CONSTRAINT "intent_signals_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outreach_messages" ADD CONSTRAINT "outreach_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "outreach_messages" ADD CONSTRAINT "outreach_messages_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lead_refresh_schedules" ADD CONSTRAINT "lead_refresh_schedules_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_refresh_schedules" ADD CONSTRAINT "lead_refresh_schedules_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
