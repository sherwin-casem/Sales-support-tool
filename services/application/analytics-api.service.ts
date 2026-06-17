import { ApiError } from "@/lib/api/api-error.js";
import { getPrismaClient } from "@/lib/db/prisma.client.js";
import type { AuthenticatedUser } from "@/types/auth/session.types.js";
import type { OutreachChannel, RecipientStatus } from "@prisma/client";
import { channelLabel } from "@/types/outreach/channel-labels.js";

export class AnalyticsApiService {
  async getCampaignAnalytics(
    user: AuthenticatedUser,
    options: { from?: Date; to?: Date } = {},
  ) {
    if (user.role === "SALES_REP") {
      return this.getAnalyticsForUser(user.id, options);
    }

    return this.getAnalyticsForOrganization(user.organizationId, options);
  }

  async getCampaignDetailAnalytics(user: AuthenticatedUser, campaignId: string) {
    const prisma = getPrismaClient();
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { recipients: true },
    });

    if (!campaign) {
      throw ApiError.notFound(`Campaign not found: ${campaignId}`);
    }

    if (user.role === "SALES_REP" && campaign.userId !== user.id) {
      throw ApiError.forbidden();
    }

    if (user.role !== "SALES_REP" && campaign.organizationId !== user.organizationId) {
      throw ApiError.forbidden();
    }

    return {
      campaignId: campaign.id,
      name: campaign.name,
      channel: campaign.channel,
      funnel: buildFunnel(campaign.recipients.map((r) => r.status)),
      recipients: campaign.recipients.length,
    };
  }

  private async getAnalyticsForUser(
    userId: string,
    options: { from?: Date; to?: Date },
  ) {
    const prisma = getPrismaClient();
    const campaigns = await prisma.campaign.findMany({
      where: {
        userId,
        ...(options.from || options.to
          ? {
              createdAt: {
                ...(options.from ? { gte: options.from } : {}),
                ...(options.to ? { lte: options.to } : {}),
              },
            }
          : {}),
      },
      include: { recipients: true },
    });

    return this.aggregateCampaigns(campaigns);
  }

  private async getAnalyticsForOrganization(
    organizationId: string,
    options: { from?: Date; to?: Date },
  ) {
    const prisma = getPrismaClient();
    const campaigns = await prisma.campaign.findMany({
      where: {
        organizationId,
        ...(options.from || options.to
          ? {
              createdAt: {
                ...(options.from ? { gte: options.from } : {}),
                ...(options.to ? { lte: options.to } : {}),
              },
            }
          : {}),
      },
      include: { recipients: true },
    });

    return this.aggregateCampaigns(campaigns);
  }

  private aggregateCampaigns(
    campaigns: Array<{
      id: string;
      name: string;
      userId: string;
      channel: OutreachChannel;
      recipients: Array<{ status: RecipientStatus }>;
    }>,
  ) {
    const allStatuses = campaigns.flatMap((c) => c.recipients.map((r) => r.status));
    const funnel = buildFunnel(allStatuses);
    const byChannel = buildChannelBreakdown(campaigns);

    return {
      campaignCount: campaigns.length,
      funnel,
      byChannel,
      campaigns: campaigns.map((campaign) => ({
        id: campaign.id,
        name: campaign.name,
        userId: campaign.userId,
        channel: campaign.channel,
        recipients: campaign.recipients.length,
        funnel: buildFunnel(campaign.recipients.map((r) => r.status)),
      })),
    };
  }
}

function buildChannelBreakdown(
  campaigns: Array<{
    channel: OutreachChannel;
    recipients: Array<{ status: RecipientStatus }>;
  }>,
) {
  const channels: OutreachChannel[] = ["EMAIL", "WHATSAPP", "LINKEDIN"];

  return channels.map((channel) => {
    const channelCampaigns = campaigns.filter((campaign) => campaign.channel === channel);
    const statuses = channelCampaigns.flatMap((campaign) =>
      campaign.recipients.map((recipient) => recipient.status),
    );

    return {
      channel,
      label: channelLabel(channel),
      campaignCount: channelCampaigns.length,
      funnel: buildFunnel(statuses),
    };
  });
}

function buildFunnel(statuses: RecipientStatus[]) {
  const total = statuses.length;
  const count = (status: RecipientStatus) =>
    statuses.filter((value) => value === status).length;

  const sent = count("SENT") + count("DELIVERED") + count("OPENED") + count("CLICKED") + count("REPLIED");
  const delivered = count("DELIVERED") + count("OPENED") + count("CLICKED") + count("REPLIED");
  const opened = count("OPENED") + count("CLICKED") + count("REPLIED");
  const clicked = count("CLICKED") + count("REPLIED");
  const replied = count("REPLIED");
  const bounced = count("BOUNCED");
  const failed = count("FAILED");

  return {
    total,
    sent,
    delivered,
    opened,
    clicked,
    replied,
    bounced,
    failed,
    sentRate: rate(sent, total),
    deliveredRate: rate(delivered, sent),
    openRate: rate(opened, delivered),
    clickRate: rate(clicked, opened),
    replyRate: rate(replied, delivered),
    bounceRate: rate(bounced, sent),
  };
}

function rate(numerator: number, denominator: number): number {
  if (denominator === 0) {
    return 0;
  }

  return Number(((numerator / denominator) * 100).toFixed(1));
}

let cachedService: AnalyticsApiService | undefined;

export function getAnalyticsApiService(): AnalyticsApiService {
  if (!cachedService) {
    cachedService = new AnalyticsApiService();
  }

  return cachedService;
}
