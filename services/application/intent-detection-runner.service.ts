import type { IntentSignalType } from "@prisma/client";
import { logger } from "@/lib/logging/logger.js";
import { getIntentRepository } from "@/repositories/prisma/intent.repository.js";
import { computeIntentScore } from "@/services/domain/intent/intent-score.service.js";
import { getIntentDetectionService } from "@/services/infrastructure/ai/intent-detection.service.js";
import type { ExtractedCompany } from "@/types/agents/company-extraction.types.js";

export async function runIntentDetectionForCompany(input: {
  companyId: string;
  companyName: string;
  domain: string;
  website: string;
  profile: ExtractedCompany;
}): Promise<void> {
  const intentRepository = getIntentRepository();
  const detectionService = getIntentDetectionService();

  const profileSummary = JSON.stringify(
    {
      industry: input.profile.industry,
      description: input.profile.description,
      products: input.profile.products,
      estimatedCompanySize: input.profile.estimatedCompanySize,
    },
    null,
    2,
  );

  const result = await detectionService.detect({
    companyId: input.companyId,
    companyName: input.companyName,
    domain: input.domain,
    website: input.website,
    industry: input.profile.industry,
    profileSummary,
  });

  if (!result.ok) {
    logger.warn("Intent detection failed", {
      companyId: input.companyId,
      message: result.error.message,
    });
    return;
  }

  const now = new Date();
  const signals = result.value.map((signal) => ({
    type: signal.type as IntentSignalType,
    title: signal.title,
    summary: signal.summary,
    sourceUrl: signal.sourceUrl ?? null,
    confidence: signal.confidence,
    expiresAt: signal.expiresAt ? new Date(signal.expiresAt) : null,
    detectedAt: now,
  }));

  await intentRepository.replaceSignalsForCompany(input.companyId, signals);

  const score = computeIntentScore(
    signals.map((signal) => ({
      type: signal.type,
      confidence: signal.confidence,
      detectedAt: now,
    })),
  );

  await intentRepository.updateCompanyIntentScore(input.companyId, score);

  logger.info("Intent detection completed", {
    companyId: input.companyId,
    signalCount: signals.length,
    intentScore: score,
  });
}
