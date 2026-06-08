import {
  domainBlocklistService,
  domainNormalizerService,
} from "@/services/domain/company/domain-normalizer.service.js";
import type { RawDiscoveryCandidate } from "@/types/agents/company-discovery.types.js";

export class CompanyDeduplicatorService {
  deduplicate(candidates: RawDiscoveryCandidate[]): RawDiscoveryCandidate[] {
    const byDomain = new Map<string, RawDiscoveryCandidate>();

    for (const candidate of candidates) {
      const normalized = domainNormalizerService.normalizeWebsite(candidate.website);

      if (!normalized) {
        continue;
      }

      if (domainBlocklistService.isBlocked(normalized.domain)) {
        continue;
      }

      const existing = byDomain.get(normalized.domain);

      if (!existing || candidate.confidence > existing.confidence) {
        byDomain.set(normalized.domain, {
          ...candidate,
          website: normalized.website,
        });
      }
    }

    return Array.from(byDomain.values()).sort(
      (left, right) => right.confidence - left.confidence,
    );
  }
}

export const companyDeduplicatorService = new CompanyDeduplicatorService();
