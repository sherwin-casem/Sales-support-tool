-- Multi-channel outreach: campaigns, recipients, delivery events

-- OutreachMessage: optional resolved contact snapshot
ALTER TABLE "outreach_messages" ADD COLUMN "toAddress" VARCHAR(500);

-- Campaign: channel + optional draft link
ALTER TABLE "campaigns" ADD COLUMN "channel" "OutreachChannel" NOT NULL DEFAULT 'EMAIL';
ALTER TABLE "campaigns" ADD COLUMN "outreachMessageId" UUID;
CREATE INDEX "campaigns_organizationId_channel_idx" ON "campaigns"("organizationId", "channel");
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_outreachMessageId_fkey"
  FOREIGN KEY ("outreachMessageId") REFERENCES "outreach_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CampaignRecipient: channel-aware addressing
ALTER TABLE "campaign_recipients" ADD COLUMN "channel" "OutreachChannel" NOT NULL DEFAULT 'EMAIL';
ALTER TABLE "campaign_recipients" ADD COLUMN "toAddress" VARCHAR(500);
ALTER TABLE "campaign_recipients" ADD COLUMN "providerMetadata" JSONB;
ALTER TABLE "campaign_recipients" ADD COLUMN "readAt" TIMESTAMPTZ(3);

-- Backfill toAddress from toEmail for existing rows
UPDATE "campaign_recipients" SET "toAddress" = "toEmail" WHERE "toAddress" IS NULL;
ALTER TABLE "campaign_recipients" ALTER COLUMN "toAddress" SET NOT NULL;

-- Replace unique constraint: campaign + toAddress (was campaign + toEmail)
DROP INDEX IF EXISTS "campaign_recipients_campaignId_toEmail_key";
CREATE UNIQUE INDEX "campaign_recipients_campaignId_toAddress_key"
  ON "campaign_recipients"("campaignId", "toAddress");

CREATE INDEX "campaign_recipients_campaignId_channel_idx" ON "campaign_recipients"("campaignId", "channel");
CREATE INDEX "campaign_recipients_providerId_idx" ON "campaign_recipients"("providerId");

-- Delivery event audit log
CREATE TABLE "delivery_events" (
    "id" UUID NOT NULL,
    "recipientId" UUID NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "eventType" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "occurredAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_events_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "delivery_events" ADD CONSTRAINT "delivery_events_recipientId_fkey"
  FOREIGN KEY ("recipientId") REFERENCES "campaign_recipients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "delivery_events_recipientId_occurredAt_idx"
  ON "delivery_events"("recipientId", "occurredAt" DESC);
CREATE INDEX "delivery_events_provider_eventType_idx"
  ON "delivery_events"("provider", "eventType");
