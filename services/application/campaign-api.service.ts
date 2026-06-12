import { ApiError } from "@/lib/api/api-error.js";
import { getOutreachConfig } from "@/lib/config/outreach.config.js";
import { validatePersonalEmail } from "@/lib/validations/lead-contact.validation.js";
import { getCampaignRepository } from "@/repositories/prisma/campaign.repository.js";
import { getCompanyRepository } from "@/repositories/prisma/company.repository.js";
import { getCampaignOrchestratorService } from "@/services/application/campaign-orchestrator.service.js";
import type { AuthenticatedUser } from "@/types/auth/session.types.js";
import type { ExtractedCompany } from "@/types/agents/company-extraction.types.js";

export interface CreateCampaignInput {
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  companyIds?: string[];
  searchResultIds?: string[];
}

function resolveRecipientEmail(profile: ExtractedCompany): string | null {
  return (
    validatePersonalEmail(profile.decisionMakerEmail, profile.email) ??
    validatePersonalEmail(profile.email)
  );
}

export class CampaignApiService {
  async createCampaign(user: AuthenticatedUser, input: CreateCampaignInput) {
    const companyRepository = getCompanyRepository();
    const campaignRepository = getCampaignRepository();
    const recipients: Array<{
      companyId: string;
      searchResultId?: string | null;
      toEmail: string;
      toName?: string | null;
    }> = [];

    if (input.searchResultIds?.length) {
      for (const searchResultId of input.searchResultIds) {
        const match = await companyRepository.findBySearchResultForUser(
          user.id,
          searchResultId,
        );

        if (!match) {
          continue;
        }

        const email = resolveRecipientEmail(match.profile.structuredData);

        if (!email) {
          throw ApiError.validationError(
            `No valid personal email for company ${match.company.domain}`,
          );
        }

        recipients.push({
          companyId: match.company.id,
          searchResultId,
          toEmail: email,
          toName: match.profile.structuredData.decisionMaker || null,
        });
      }
    }

    if (input.companyIds?.length) {
      for (const companyId of input.companyIds) {
        const detail = await companyRepository.findDetailForUser(user.id, companyId);

        if (!detail?.profile) {
          throw ApiError.notFound(`Company not found: ${companyId}`);
        }

        const email = resolveRecipientEmail(detail.profile.structuredData);

        if (!email) {
          throw ApiError.validationError(
            `No valid personal email for company ${detail.domain}`,
          );
        }

        recipients.push({
          companyId,
          toEmail: email,
          toName: detail.profile.structuredData.decisionMaker || null,
        });
      }
    }

    if (recipients.length === 0) {
      throw ApiError.invalidInput("At least one recipient is required");
    }

    const { campaign } = await campaignRepository.createCampaign({
      userId: user.id,
      organizationId: user.organizationId,
      name: input.name,
      subject: input.subject,
      bodyHtml: input.bodyHtml,
      bodyText: input.bodyText,
      recipients,
    });

    return this.mapCampaignSummary(campaign);
  }

  async listCampaigns(user: AuthenticatedUser) {
    const campaigns = await getCampaignRepository().listForUser(
      user.id,
      user.organizationId,
      user.role,
    );

    return Promise.all(campaigns.map((campaign) => this.mapCampaignSummary(campaign)));
  }

  async getCampaign(user: AuthenticatedUser, campaignId: string) {
    const campaign = await getCampaignRepository().findById(campaignId);

    if (!campaign) {
      throw ApiError.notFound(`Campaign not found: ${campaignId}`);
    }

    if (user.role === "SALES_REP" && campaign.userId !== user.id) {
      throw ApiError.forbidden("Cannot view another rep's campaign");
    }

    if (user.role !== "SALES_REP" && campaign.organizationId !== user.organizationId) {
      throw ApiError.forbidden("Campaign not in your organization");
    }

    const statusCounts = await getCampaignRepository().countRecipientsByStatus(campaignId);

    return {
      ...this.mapCampaignSummary(campaign),
      recipients: campaign.recipients.map((recipient) => ({
        id: recipient.id,
        companyId: recipient.companyId,
        toEmail: recipient.toEmail,
        toName: recipient.toName,
        status: recipient.status,
        sentAt: recipient.sentAt?.toISOString() ?? null,
        deliveredAt: recipient.deliveredAt?.toISOString() ?? null,
        openedAt: recipient.openedAt?.toISOString() ?? null,
        clickedAt: recipient.clickedAt?.toISOString() ?? null,
        errorMessage: recipient.errorMessage,
      })),
      statusCounts,
    };
  }

  async scheduleCampaign(user: AuthenticatedUser, campaignId: string, scheduledAt: Date) {
    const campaign = await this.getCampaign(user, campaignId);
    await getCampaignRepository().updateStatus(campaign.id, "SCHEDULED", { scheduledAt });
    return { id: campaign.id, status: "SCHEDULED", scheduledAt: scheduledAt.toISOString() };
  }

  async sendCampaign(user: AuthenticatedUser, campaignId: string) {
    await this.getCampaign(user, campaignId);

    const { resendApiKey } = getOutreachConfig();

    if (!resendApiKey.trim()) {
      throw ApiError.serviceUnavailable(
        "Email delivery is not configured. Set RESEND_API_KEY to send campaigns.",
      );
    }

    await getCampaignOrchestratorService().sendCampaign(campaignId, user.id);

    return { id: campaignId, status: "COMPLETED" };
  }

  async pauseCampaign(user: AuthenticatedUser, campaignId: string) {
    await this.getCampaign(user, campaignId);
    await getCampaignRepository().updateStatus(campaignId, "PAUSED");
    return { id: campaignId, status: "PAUSED" };
  }

  private mapCampaignSummary(campaign: {
    id: string;
    name: string;
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
      status: campaign.status,
      subject: campaign.subject,
      scheduledAt: campaign.scheduledAt?.toISOString() ?? null,
      startedAt: campaign.startedAt?.toISOString() ?? null,
      completedAt: campaign.completedAt?.toISOString() ?? null,
      createdAt: campaign.createdAt.toISOString(),
    };
  }
}

let cachedService: CampaignApiService | undefined;

export function getCampaignApiService(): CampaignApiService {
  if (!cachedService) {
    cachedService = new CampaignApiService();
  }

  return cachedService;
}
