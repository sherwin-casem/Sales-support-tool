import { describe, expect, it } from "vitest";
import { CompanyDeduplicatorService } from "@/services/domain/company/company-deduplicator.service.js";
import type { RawDiscoveryCandidate } from "@/types/agents/company-discovery.types.js";

describe("CompanyDeduplicatorService", () => {
  it("deduplicates by domain and keeps highest confidence", () => {
    const service = new CompanyDeduplicatorService();
    const candidates: RawDiscoveryCandidate[] = [
      {
        companyName: "Acme Logistics",
        website: "https://www.acme.fi",
        source: "openai_web_search",
        confidence: 0.85,
      },
      {
        companyName: "ACME",
        website: "https://acme.fi/about",
        source: "openai_web_search",
        confidence: 0.55,
      },
      {
        companyName: "LinkedIn",
        website: "https://linkedin.com/company/acme",
        source: "openai_web_search",
        confidence: 0.99,
      },
    ];

    const result = service.deduplicate(candidates);

    expect(result).toHaveLength(1);
    expect(result[0]?.companyName).toBe("Acme Logistics");
    expect(result[0]?.website).toBe("https://acme.fi");
  });
});
