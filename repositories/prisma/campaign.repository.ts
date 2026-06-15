import type { CampaignStatus, OutreachChannel, Prisma, RecipientStatus } from "@prisma/client";
import { getPrismaClient } from "@/lib/db/prisma.client.js";

export interface CampaignRecord {
  id: string;
  userId: string;
  organizationId: string;
  name: string;
  channel: OutreachChannel;
  status: CampaignStatus;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  outreachMessageId: string | null;
  scheduledAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignRecipientRecord {
  id: string;
  campaignId: string;
  companyId: string;
  searchResultId: string | null;
  channel: OutreachChannel;
  toAddress: string;
  toEmail: string;
  toName: string | null;
  status: RecipientStatus;
  providerId: string | null;
  providerMetadata: Record<string, unknown> | null;
  sentAt: Date | null;
  deliveredAt: Date | null;
  openedAt: Date | null;
  readAt: Date | null;
  clickedAt: Date | null;
  repliedAt: Date | null;
  bouncedAt: Date | null;
  errorMessage: string | null;
}

export class CampaignRepository {
  async createCampaign(input: {
    userId: string;
    organizationId: string;
    name: string;
    channel: OutreachChannel;
    subject: string;
    bodyHtml: string;
    bodyText: string;
    outreachMessageId?: string | null;
    recipients: Array<{
      companyId: string;
      searchResultId?: string | null;
      channel: OutreachChannel;
      toAddress: string;
      toEmail?: string | null;
      toName?: string | null;
    }>;
  }): Promise<{ campaign: CampaignRecord; recipients: CampaignRecipientRecord[] }> {
    const prisma = getPrismaClient();

    const campaign = await prisma.campaign.create({
      data: {
        userId: input.userId,
        organizationId: input.organizationId,
        name: input.name,
        channel: input.channel,
        subject: input.subject,
        bodyHtml: input.bodyHtml,
        bodyText: input.bodyText,
        outreachMessageId: input.outreachMessageId ?? null,
        recipients: {
          create: input.recipients.map((recipient) => ({
            companyId: recipient.companyId,
            searchResultId: recipient.searchResultId ?? null,
            channel: recipient.channel,
            toAddress: recipient.toAddress,
            toEmail: recipient.toEmail ?? recipient.toAddress,
            toName: recipient.toName ?? null,
          })),
        },
      },
      include: { recipients: true },
    });

    return {
      campaign: mapCampaign(campaign),
      recipients: campaign.recipients.map(mapRecipient),
    };
  }

  async findById(id: string): Promise<(CampaignRecord & { recipients: CampaignRecipientRecord[] }) | null> {
    const campaign = await getPrismaClient().campaign.findUnique({
      where: { id },
      include: { recipients: true },
    });

    if (!campaign) {
      return null;
    }

    return {
      ...mapCampaign(campaign),
      recipients: campaign.recipients.map(mapRecipient),
    };
  }

  async listForUser(userId: string, organizationId: string, role: string): Promise<CampaignRecord[]> {
    const where =
      role === "SALES_REP"
        ? { userId }
        : { organizationId };

    const campaigns = await getPrismaClient().campaign.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return campaigns.map(mapCampaign);
  }

  async updateStatus(
    id: string,
    status: CampaignStatus,
    timestamps?: Partial<{ scheduledAt: Date | null; startedAt: Date | null; completedAt: Date | null }>,
  ): Promise<CampaignRecord> {
    const campaign = await getPrismaClient().campaign.update({
      where: { id },
      data: { status, ...timestamps },
    });
    return mapCampaign(campaign);
  }

  async updateRecipientStatus(
    id: string,
    status: RecipientStatus,
    fields: Partial<{
      providerId: string;
      providerMetadata: Prisma.InputJsonValue;
      sentAt: Date;
      deliveredAt: Date;
      openedAt: Date;
      readAt: Date;
      clickedAt: Date;
      repliedAt: Date;
      bouncedAt: Date;
      errorMessage: string;
    }>,
  ): Promise<CampaignRecipientRecord> {
    const recipient = await getPrismaClient().campaignRecipient.update({
      where: { id },
      data: { status, ...fields },
    });
    return mapRecipient(recipient);
  }

  async findRecipientByProviderId(providerId: string): Promise<CampaignRecipientRecord | null> {
    const recipient = await getPrismaClient().campaignRecipient.findFirst({
      where: { providerId },
    });
    return recipient ? mapRecipient(recipient) : null;
  }

  async listPendingRecipients(campaignId: string): Promise<CampaignRecipientRecord[]> {
    const recipients = await getPrismaClient().campaignRecipient.findMany({
      where: { campaignId, status: "PENDING" },
      orderBy: { createdAt: "asc" },
    });
    return recipients.map(mapRecipient);
  }

  async listDueScheduledCampaigns(now = new Date()): Promise<CampaignRecord[]> {
    const campaigns = await getPrismaClient().campaign.findMany({
      where: {
        status: "SCHEDULED",
        scheduledAt: { lte: now },
      },
      orderBy: { scheduledAt: "asc" },
    });

    return campaigns.map(mapCampaign);
  }

  async countRecipientsByStatus(campaignId: string): Promise<Record<RecipientStatus, number>> {
    const groups = await getPrismaClient().campaignRecipient.groupBy({
      by: ["status"],
      where: { campaignId },
      _count: { status: true },
    });

    const counts = {} as Record<RecipientStatus, number>;
    for (const group of groups) {
      counts[group.status] = group._count.status;
    }
    return counts;
  }

  async createDeliveryEvent(input: {
    recipientId: string;
    provider: string;
    eventType: string;
    payload: Prisma.InputJsonValue;
    occurredAt: Date;
  }): Promise<void> {
    await getPrismaClient().deliveryEvent.create({
      data: {
        recipientId: input.recipientId,
        provider: input.provider,
        eventType: input.eventType,
        payload: input.payload,
        occurredAt: input.occurredAt,
      },
    });
  }
}

function mapCampaign(row: {
  id: string;
  userId: string;
  organizationId: string;
  name: string;
  channel: OutreachChannel;
  status: CampaignStatus;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  outreachMessageId: string | null;
  scheduledAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): CampaignRecord {
  return { ...row };
}

function mapRecipient(row: {
  id: string;
  campaignId: string;
  companyId: string;
  searchResultId: string | null;
  channel: OutreachChannel;
  toAddress: string;
  toEmail: string;
  toName: string | null;
  status: RecipientStatus;
  providerId: string | null;
  providerMetadata: Prisma.JsonValue;
  sentAt: Date | null;
  deliveredAt: Date | null;
  openedAt: Date | null;
  readAt: Date | null;
  clickedAt: Date | null;
  repliedAt: Date | null;
  bouncedAt: Date | null;
  errorMessage: string | null;
}): CampaignRecipientRecord {
  return {
    ...row,
    providerMetadata:
      row.providerMetadata && typeof row.providerMetadata === "object" && !Array.isArray(row.providerMetadata)
        ? (row.providerMetadata as Record<string, unknown>)
        : null,
  };
}

let cachedRepository: CampaignRepository | undefined;

export function getCampaignRepository(): CampaignRepository {
  if (!cachedRepository) {
    cachedRepository = new CampaignRepository();
  }

  return cachedRepository;
}
