import { logger } from "@/lib/logging/logger.js";
import { getOutreachConfig } from "@/lib/config/outreach.config.js";
import { runWithConcurrency } from "@/lib/utils/concurrency.js";
import { getCompanyRepository } from "@/repositories/prisma/company.repository.js";
import { getLeadRefreshRepository } from "@/repositories/prisma/lead-refresh.repository.js";
import { runIntentDetectionForCompany } from "@/services/application/intent-detection-runner.service.js";
import { getLeadEnrichmentService } from "@/services/infrastructure/ai/lead-enrichment.service.js";
import { hashEnrichmentProfile } from "@/services/infrastructure/ai/lead-enrichment.service.js";
import { computeExtractionCompleteness } from "@/lib/validations/company-extraction.schema.js";
import type { ExtractedCompany } from "@/types/agents/company-extraction.types.js";

export class LeadRefreshService {
  async upsertSchedule(input: {
    userId: string;
    companyId: string;
    intervalDays: number;
    enabled: boolean;
  }) {
    const schedule = await getLeadRefreshRepository().upsertSchedule(input);
    return {
      id: schedule.id,
      companyId: schedule.companyId,
      intervalDays: schedule.intervalDays,
      enabled: schedule.enabled,
      nextRunAt: schedule.nextRunAt.toISOString(),
      lastRunAt: schedule.lastRunAt?.toISOString() ?? null,
    };
  }

  async getSchedule(userId: string, companyId: string) {
    const schedule = await getLeadRefreshRepository().findByUserAndCompany(
      userId,
      companyId,
    );
    if (!schedule) {
      return null;
    }
    return {
      id: schedule.id,
      companyId: schedule.companyId,
      intervalDays: schedule.intervalDays,
      enabled: schedule.enabled,
      nextRunAt: schedule.nextRunAt.toISOString(),
      lastRunAt: schedule.lastRunAt?.toISOString() ?? null,
    };
  }

  async processDueSchedules(): Promise<{ processed: number; failed: number }> {
    const config = getOutreachConfig();
    const schedules = await getLeadRefreshRepository().listDueSchedules(
      config.refreshBatchSize,
    );

    let processed = 0;
    let failed = 0;

    await runWithConcurrency(schedules, config.refreshConcurrency, async (schedule) => {
      try {
        await this.refreshCompany(schedule.userId, schedule.companyId);
        await getLeadRefreshRepository().markRunComplete(
          schedule.id,
          schedule.intervalDays,
        );
        processed += 1;
      } catch (error) {
        failed += 1;
        logger.error("Lead refresh failed", {
          scheduleId: schedule.id,
          companyId: schedule.companyId,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    return { processed, failed };
  }

  private async refreshCompany(userId: string, companyId: string): Promise<void> {
    const companyRepository = getCompanyRepository();
    const detail = await companyRepository.findDetailForUser(userId, companyId);

    if (!detail?.profile) {
      throw new Error("Company profile not found");
    }

    const enrichment = getLeadEnrichmentService();
    const result = await enrichment.enrich({
      companyId,
      companyName: detail.profile.structuredData.companyName,
      domain: detail.normalizedDomain,
      website: detail.websiteUrl ?? `https://${detail.normalizedDomain}`,
      websiteProfile: detail.profile.structuredData,
    });

    if (!result.ok) {
      throw new Error(result.error.message);
    }

    const profile = result.value.profile;
    const contentHash = hashEnrichmentProfile(profile);
    const existingHash = detail.profile.contentHash;

    if (existingHash && existingHash === contentHash) {
      logger.info("Lead refresh skipped unchanged profile", { companyId });
      return;
    }

    await companyRepository.saveProfile({
      companyId,
      structuredData: profile,
      completeness: computeExtractionCompleteness(profile),
      modelUsed: result.value.meta.modelUsed,
      promptVersion: result.value.meta.promptVersion,
      contentHash,
      extractedAt: new Date(result.value.meta.enrichedAt),
    });

    await runIntentDetectionForCompany({
      companyId,
      companyName: profile.companyName,
      domain: detail.normalizedDomain,
      website: detail.websiteUrl ?? `https://${detail.normalizedDomain}`,
      profile,
    });
  }
}

let cachedService: LeadRefreshService | undefined;

export function getLeadRefreshService(): LeadRefreshService {
  if (!cachedService) {
    cachedService = new LeadRefreshService();
  }

  return cachedService;
}
