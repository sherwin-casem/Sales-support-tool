import { logger } from "@/lib/logging/logger.js";
import { getOutreachConfig } from "@/lib/config/outreach.config.js";
import { validatePersonalEmail } from "@/lib/validations/lead-contact.validation.js";
import { getCampaignRepository } from "@/repositories/prisma/campaign.repository.js";
import { getCompanyRepository } from "@/repositories/prisma/company.repository.js";
import { getResendEmailAdapter } from "@/services/infrastructure/email/resend-email.adapter.js";
import type { ExtractedCompany } from "@/types/agents/company-extraction.types.js";

function resolveRecipientEmail(profile: ExtractedCompany): string | null {
  return (
    validatePersonalEmail(profile.decisionMakerEmail, profile.email) ??
    validatePersonalEmail(profile.email)
  );
}

export class CampaignOrchestratorService {
  async sendCampaign(campaignId: string, userId: string): Promise<void> {
    const campaignRepository = getCampaignRepository();
    const companyRepository = getCompanyRepository();
    const emailAdapter = getResendEmailAdapter();
    const config = getOutreachConfig();

    const campaign = await campaignRepository.findById(campaignId);

    if (!campaign || campaign.userId !== userId) {
      throw new Error("Campaign not found");
    }

    if (campaign.status !== "RUNNING") {
      await campaignRepository.updateStatus(campaignId, "RUNNING", {
        startedAt: new Date(),
      });
    }

    const pending = await campaignRepository.listPendingRecipients(campaignId);
    const delayMs = Math.ceil(60_000 / Math.max(1, config.sendRatePerMinute));
    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of pending) {
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

        const validatedEmail = resolveRecipientEmail(profile) ?? recipient.toEmail;

        const result = await emailAdapter.send({
          to: validatedEmail,
          toName: recipient.toName,
          subject: campaign.subject,
          bodyHtml: campaign.bodyHtml,
          bodyText: campaign.bodyText,
          tags: { campaignId, recipientId: recipient.id },
        });

        await campaignRepository.updateRecipientStatus(recipient.id, "SENT", {
          providerId: result.providerId,
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
      sentCount,
      failedCount,
      status: finalStatus,
    });
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
