import { ApiError } from "@/lib/api/api-error.js";
import { logger } from "@/lib/logging/logger.js";
import {
  getChannelRatePerMinute,
  getOutreachConfig,
} from "@/lib/config/outreach.config.js";
import { getCampaignRepository } from "@/repositories/prisma/campaign.repository.js";
import { getCompanyRepository } from "@/repositories/prisma/company.repository.js";
import { getDeliveryAdapter } from "@/services/infrastructure/outreach/delivery-adapter.registry.js";
import type { OutreachDeliveryPort } from "@/services/infrastructure/outreach/outreach-delivery.port.js";
import {
  resolveRecipientForChannel,
} from "@/services/domain/outreach/recipient-resolver.service.js";

export interface CampaignOrchestratorDependencies {
  getDeliveryAdapter?: typeof getDeliveryAdapter;
  getOutreachConfig?: typeof getOutreachConfig;
}

export class CampaignOrchestratorService {
  constructor(private readonly deps: CampaignOrchestratorDependencies = {}) {}

  async sendCampaign(campaignId: string, userId: string): Promise<void> {
    const campaignRepository = getCampaignRepository();
    const companyRepository = getCompanyRepository();
    const config = (this.deps.getOutreachConfig ?? getOutreachConfig)();
    const resolveAdapter = this.deps.getDeliveryAdapter ?? getDeliveryAdapter;

    const campaign = await campaignRepository.findById(campaignId);

    if (!campaign || campaign.userId !== userId) {
      throw ApiError.notFound("Campaign not found");
    }

    if (campaign.status === "PAUSED") {
      return;
    }

    if (campaign.status !== "RUNNING") {
      await campaignRepository.updateStatus(campaignId, "RUNNING", {
        startedAt: new Date(),
      });
    }

    const adapter = resolveAdapter(campaign.channel);
    const pending = await campaignRepository.listPendingRecipients(campaignId);
    const delayMs = Math.ceil(
      60_000 / Math.max(1, getChannelRatePerMinute(campaign.channel, config)),
    );
    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of pending) {
      const latestCampaign = await campaignRepository.findById(campaignId);

      if (!latestCampaign || latestCampaign.status === "PAUSED") {
        logger.info("Campaign send paused", { campaignId });
        return;
      }

      try {
        const detail = await companyRepository.findDetailForUser(userId, recipient.companyId);
        const profile = detail?.profile?.structuredData;

        if (!profile) {
          await campaignRepository.updateRecipientStatus(recipient.id, "FAILED", {
            errorMessage: "Company profile not found",
          });
          failedCount += 1;
          continue;
        }

        const resolved =
          resolveRecipientForChannel(profile, campaign.channel) ??
          ({
            channel: campaign.channel,
            toAddress: recipient.toAddress,
            toName: recipient.toName,
            toEmail: recipient.toEmail || null,
          } as const);

        const result = await this.sendViaAdapter(adapter, campaign, recipient.id, resolved);

        await campaignRepository.updateRecipientStatus(recipient.id, "SENT", {
          providerId: result.providerId,
          providerMetadata: result.metadata ?? undefined,
          sentAt: new Date(),
        });
        sentCount += 1;
      } catch (error) {
        await campaignRepository.updateRecipientStatus(recipient.id, "FAILED", {
          errorMessage: error instanceof Error ? error.message : "Send failed",
        });
        failedCount += 1;
      }

      await sleep(delayMs);
    }

    const finalStatus = failedCount > 0 && sentCount === 0 ? "FAILED" : "COMPLETED";

    await campaignRepository.updateStatus(campaignId, finalStatus, {
      completedAt: new Date(),
    });

    logger.info("Campaign send completed", {
      campaignId,
      channel: campaign.channel,
      sentCount,
      failedCount,
      status: finalStatus,
    });
  }

  private async sendViaAdapter(
    adapter: OutreachDeliveryPort,
    campaign: {
      id: string;
      channel: "EMAIL" | "WHATSAPP" | "LINKEDIN";
      subject: string;
      bodyHtml: string;
      bodyText: string;
    },
    recipientId: string,
    resolved: {
      toAddress: string;
      toName: string | null;
    },
  ) {
    const tags = { campaignId: campaign.id, recipientId };

    switch (campaign.channel) {
      case "EMAIL":
        return adapter.send({
          channel: "EMAIL",
          toAddress: resolved.toAddress,
          toName: resolved.toName,
          subject: campaign.subject,
          bodyHtml: campaign.bodyHtml,
          bodyText: campaign.bodyText,
          tags,
        });
      case "WHATSAPP":
        return adapter.send({
          channel: "WHATSAPP",
          toAddress: resolved.toAddress,
          toName: resolved.toName,
          bodyText: campaign.bodyText,
          tags,
        });
      case "LINKEDIN":
        return adapter.send({
          channel: "LINKEDIN",
          toAddress: resolved.toAddress,
          toName: resolved.toName,
          bodyText: campaign.bodyText,
          tags,
        });
      default:
        throw ApiError.invalidInput(`Unsupported channel: ${campaign.channel}`);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let cachedService: CampaignOrchestratorService | undefined;

export function getCampaignOrchestratorService(): CampaignOrchestratorService {
  if (!cachedService) {
    cachedService = new CampaignOrchestratorService();
  }

  return cachedService;
}

export function createCampaignOrchestratorService(
  deps: CampaignOrchestratorDependencies,
): CampaignOrchestratorService {
  return new CampaignOrchestratorService(deps);
}
