import { describe, expect, it, vi } from "vitest";
import { CompanyDiscoveryAgent } from "@/agents/discovery/company-discovery.agent.js";
import { DiscoverySourceError } from "@/services/infrastructure/discovery/sources/discovery-source.interface.js";
import type { DiscoverySource } from "@/services/infrastructure/discovery/sources/discovery-source.interface.js";
import type { DiscoveryCriteria, RawDiscoveryCandidate } from "@/types/agents/company-discovery.types.js";

function createSource(
  name: string,
  tier: 1 | 2,
  candidates: RawDiscoveryCandidate[] | "fail",
): DiscoverySource {
  return {
    name,
    tier,
    discover: vi.fn(async () => {
      if (candidates === "fail") {
        throw new DiscoverySourceError(name, `${name} failed`);
      }

      return candidates;
    }),
  };
}

describe("CompanyDiscoveryAgent", () => {
  it("merges tier 1 results and skips tier 2 when limit is met", async () => {
    const tier1 = createSource("wikidata", 1, [
      {
        companyName: "Acme Logistics",
        website: "https://www.acme.fi",
        source: "wikidata",
        confidence: 0.85,
      },
    ]);
    const tier2 = createSource("duckduckgo_html", 2, [
      {
        companyName: "Other Logistics",
        website: "https://other.fi",
        source: "duckduckgo_html",
        confidence: 0.55,
      },
    ]);

    const agent = new CompanyDiscoveryAgent({ sources: [tier1, tier2] });
    const result = await agent.execute({
      industry: "logistics",
      location: "Finland",
      limit: 1,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual([
        {
          companyName: "Acme Logistics",
          website: "https://acme.fi",
        },
      ]);
    }

    expect(tier2.discover).not.toHaveBeenCalled();
  });

  it("falls back to tier 2 when tier 1 returns insufficient results", async () => {
    const tier1 = createSource("wikidata", 1, []);
    const tier2 = createSource("duckduckgo_html", 2, [
      {
        companyName: "Fallback Logistics",
        website: "https://fallback.fi",
        source: "duckduckgo_html",
        confidence: 0.65,
      },
    ]);

    const agent = new CompanyDiscoveryAgent({ sources: [tier1, tier2] });
    const result = await agent.execute({
      industry: "logistics",
      location: "Finland",
      limit: 5,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value[0]?.companyName).toBe("Fallback Logistics");
    }

    expect(tier2.discover).toHaveBeenCalledOnce();
  });

  it("returns all sources failed when every source throws", async () => {
    const tier1 = createSource("wikidata", 1, "fail");
    const tier2 = createSource("duckduckgo_html", 2, "fail");

    const agent = new CompanyDiscoveryAgent({ sources: [tier1, tier2] });
    const result = await agent.execute({
      industry: "logistics",
      location: "Finland",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("ALL_SOURCES_FAILED");
    }
  });

  it("retries with generic industry when specific industry returns no results", async () => {
    const wikidata: DiscoverySource = {
      name: "wikidata",
      tier: 1,
      discover: vi
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            companyName: "US Business Inc",
            website: "https://usbusiness.com",
            source: "wikidata",
            confidence: 0.85,
          },
        ]),
    };
    const duckduckgo: DiscoverySource = {
      name: "duckduckgo_html",
      tier: 2,
      discover: vi.fn().mockResolvedValue([]),
    };

    const agent = new CompanyDiscoveryAgent({ sources: [wikidata, duckduckgo] });
    const result = await agent.execute({
      industry: "obscure-industry",
      location: "United States",
      limit: 5,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual([
        {
          companyName: "US Business Inc",
          website: "https://usbusiness.com",
        },
      ]);
    }
    expect(wikidata.discover).toHaveBeenCalledTimes(2);
  });

  it("returns invalid input for empty industry", async () => {
    const agent = new CompanyDiscoveryAgent({ sources: [] });
    const result = await agent.execute({
      industry: "  ",
      location: "Finland",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_INPUT");
    }
  });
});
