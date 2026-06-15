import { ApiError } from "@/lib/api/api-error.js";
import {
  getChannelConfigError,
  getOutreachConfig,
  isChannelConfigured,
} from "@/lib/config/outreach.config.js";
import { resolveOutreachBodyHtml } from "@/lib/validations/outreach-message.schema.js";
import type { CreateCampaignInput } from "@/lib/validations/campaign.schema.js";
import type { CampaignRepository } from "@/repositories/prisma/campaign.repository.js";
import type { CompanyRepository } from "@/repositories/interfaces/company.repository.interface.js";
import type { CampaignOrchestratorService } from "@/services/application/campaign-orchestrator.service.js";
import {
  getRecipientMissingContactMessage,
  resolveRecipientForChannel,
} from "@/services/domain/outreach/recipient-resolver.service.js";
import type { AuthenticatedUser } from "@/types/auth/session.types.js";

export interface CampaignApiServiceDependencies {
  campaignRepository: CampaignRepository;
  companyRepository: CompanyRepository;
  campaignOrchestrator: Pick<CampaignOrchestratorService, "sendCampaign">;
  scheduleBackgroundTask: (task: () => void | Promise<void>) => void;
  getOutreachConfig?: typeof getOutreachConfig;
}

export class CampaignApiService {
  constructor(private readonly deps: CampaignApiServiceDependencies) {}

  async createCampaign(user: AuthenticatedUser, input: CreateCampaignInput) {
    const channel = input.channel;
    const outreachConfig = (this.deps.getOutreachConfig ?? getOutreachConfig)();

    if (!isChannelConfigured(channel, outreachConfig)) {
      throw ApiError.serviceUnavailable(getChannelConfigError(channel));
    }

    const recipients: Array<{
      companyId: string;
      searchResultId?: string | null;
      channel: typeof channel;
      toAddress: string;
      toEmail?: string | null;
      toName?: string | null;
    }> = [];

    if (input.searchResultIds?.length) {
      for (const searchResultId of input.searchResultIds) {
        const match = await this.deps.companyRepository.findBySearchResultForUser(
          user.id,
          searchResultId,
        );

        if (!match) {
          continue;
        }

        const resolved = resolveRecipientForChannel(match.profile.structuredData, channel);

        if (!resolved) {
          throw ApiError.validationError(
            getRecipientMissingContactMessage(channel, match.company.domain),
          );
        }

        recipients.push({
          companyId: match.company.id,
          searchResultId,
          channel,
          toAddress: resolved.toAddress,
          toEmail: resolved.toEmail,
          toName: resolved.toName,
        });
      }
    }

    if (input.companyIds?.length) {
      for (const companyId of input.companyIds) {
        const detail = await this.deps.companyRepository.findDetailForUser(user.id, companyId);

        if (!detail?.profile) {
          throw ApiError.notFound(`Company not found: ${companyId}`);
        }

        const resolved = resolveRecipientForChannel(detail.profile.structuredData, channel);

        if (!resolved) {
          throw ApiError.validationError(
            getRecipientMissingContactMessage(channel, detail.domain),
          );
        }

        recipients.push({
          companyId,
          channel,
          toAddress: resolved.toAddress,
          toEmail: resolved.toEmail,
          toName: resolved.toName,
        });
      }
    }

    if (recipients.length === 0) {
      throw ApiError.invalidInput("At least one recipient is required");
    }

    const bodyHtml =
      channel === "EMAIL"
        ? resolveOutreachBodyHtml(input.bodyText, input.bodyHtml || null)
        : "";
    const subject = channel === "EMAIL" ? input.subject : input.subject || "Outreach";

    const { campaign } = await this.deps.campaignRepository.createCampaign({
      userId: user.id,
      organizationId: user.organizationId,
      name: input.name,
      channel,
      subject,
      bodyHtml,
      bodyText: input.bodyText,
      outreachMessageId: input.outreachMessageId,
      recipients,
    });

    return this.mapCampaignSummary(campaign);
  }

  async listCampaigns(user: AuthenticatedUser) {
    const campaigns = await this.deps.campaignRepository.listForUser(
      user.id,
      user.organizationId,
      user.role,
    );

    return Promise.all(campaigns.map((campaign) => this.mapCampaignSummary(campaign)));
  }

  async getCampaign(user: AuthenticatedUser, campaignId: string) {
    const campaign = await this.deps.campaignRepository.findById(campaignId);

    if (!campaign) {
      throw ApiError.notFound(`Campaign not found: ${campaignId}`);
    }

    if (user.role === "SALES_REP" && campaign.userId !== user.id) {
      throw ApiError.forbidden("Cannot view another rep's campaign");
    }

    if (user.role !== "SALES_REP" && campaign.organizationId !== user.organizationId) {
      throw ApiError.forbidden("Campaign not in your organization");
    }

    const statusCounts = await this.deps.campaignRepository.countRecipientsByStatus(campaignId);

    return {
      ...this.mapCampaignSummary(campaign),
      recipients: campaign.recipients.map((recipient) => ({
        id: recipient.id,
        companyId: recipient.companyId,
        channel: recipient.channel,
        toAddress: recipient.toAddress,
        toEmail: recipient.toEmail,
        toName: recipient.toName,
        status: recipient.status,
        sentAt: recipient.sentAt?.toISOString() ?? null,
        deliveredAt: recipient.deliveredAt?.toISOString() ?? null,
        openedAt: recipient.openedAt?.toISOString() ?? null,
        readAt: recipient.readAt?.toISOString() ?? null,
        clickedAt: recipient.clickedAt?.toISOString() ?? null,
        repliedAt: recipient.repliedAt?.toISOString() ?? null,
        errorMessage: recipient.errorMessage,
      })),
      statusCounts,
    };
  }

  async scheduleCampaign(user: AuthenticatedUser, campaignId: string, scheduledAt: Date) {
    const campaign = await this.getCampaign(user, campaignId);
    await this.deps.campaignRepository.updateStatus(campaign.id, "SCHEDULED", { scheduledAt });
    return { id: campaign.id, status: "SCHEDULED", scheduledAt: scheduledAt.toISOString() };
  }

  async sendCampaign(user: AuthenticatedUser, campaignId: string) {
    const campaign = await this.getCampaign(user, campaignId);
    const outreachConfig = (this.deps.getOutreachConfig ?? getOutreachConfig)();

    if (!isChannelConfigured(campaign.channel, outreachConfig)) {
      throw ApiError.serviceUnavailable(getChannelConfigError(campaign.channel));
    }

    if (campaign.status === "RUNNING") {
      return { id: campaignId, status: "RUNNING" };
    }

    if (campaign.status !== "DRAFT" && campaign.status !== "SCHEDULED") {
      throw ApiError.invalidInput(`Campaign cannot be sent from status ${campaign.status}`);
    }

    await this.deps.campaignRepository.updateStatus(campaignId, "RUNNING", {
      startedAt: new Date(),
    });

    const userId = user.id;
    this.deps.scheduleBackgroundTask(() =>
      this.deps.campaignOrchestrator.sendCampaign(campaignId, userId),
    );

    return { id: campaignId, status: "RUNNING" };
  }

  async pauseCampaign(user: AuthenticatedUser, campaignId: string) {
    await this.getCampaign(user, campaignId);
    await this.deps.campaignRepository.updateStatus(campaignId, "PAUSED");
    return { id: campaignId, status: "PAUSED" };
  }

  async processDueScheduledCampaigns(): Promise<{ processedCampaignIds: string[] }> {
    const dueCampaigns = await this.deps.campaignRepository.listDueScheduledCampaigns();
    const outreachConfig = (this.deps.getOutreachConfig ?? getOutreachConfig)();
    const processedCampaignIds: string[] = [];

    for (const campaign of dueCampaigns) {
      if (!isChannelConfigured(campaign.channel, outreachConfig)) {
        continue;
      }

      await this.deps.campaignRepository.updateStatus(campaign.id, "RUNNING", {
        startedAt: new Date(),
      });

      const userId = campaign.userId;
      this.deps.scheduleBackgroundTask(() =>
        this.deps.campaignOrchestrator.sendCampaign(campaign.id, userId),
      );
      processedCampaignIds.push(campaign.id);
    }

    return { processedCampaignIds };
  }

  private mapCampaignSummary(campaign: {
    id: string;
    name: string;
    channel: string;
    status: string;
    subject: string;
    scheduledAt: Date | null;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: campaign.id,
      name: campaign.name,
      channel: campaign.channel,
      status: campaign.status,
      subject: campaign.subject,
      scheduledAt: campaign.scheduledAt?.toISOString() ?? null,
      startedAt: campaign.startedAt?.toISOString() ?? null,
      completedAt: campaign.completedAt?.toISOString() ?? null,
      createdAt: campaign.createdAt.toISOString(),
    };
  }
}

export function createCampaignApiService(
  deps: CampaignApiServiceDependencies,
): CampaignApiService {
  return new CampaignApiService(deps);
}

export type { CreateCampaignInput };
