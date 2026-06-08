import { describe, expect, it, vi } from "vitest";
import { QueryParserError } from "@/types/agents/agent-error.types.js";
import { SearchOrchestrator } from "@/services/application/search-orchestrator.service.js";
import { ok, err } from "@/lib/utils/result.js";
import type { SearchOrchestratorDependencies } from "@/services/application/search-orchestrator.service.js";

const userId = "00000000-0000-4000-8000-000000000001";
const searchJobId = "00000000-0000-4000-8000-000000000030";
const companyId = "00000000-0000-4000-8000-000000000010";
const searchResultId = "00000000-0000-4000-8000-000000000040";

const criteria = {
  industry: "logistics",
  location: "Finland",
  employeeRange: "50-200",
};

const extractedProfile = {
  companyName: "Acme Logistics Oy",
  description: "Freight and warehousing provider established since 1998 in Finland.",
  industry: "logistics",
  products: ["Tracking Platform"],
  services: ["Freight forwarding", "Warehousing"],
  targetCustomers: ["Manufacturers"],
  estimatedCompanySize: "100-200",
};

function createDependencies(
  overrides: Partial<SearchOrchestratorDependencies> = {},
): SearchOrchestratorDependencies {
  const searchResults = [
    {
      id: searchResultId,
      searchJobId,
      companyId,
      stage: "DISCOVERED" as const,
      rank: 1,
      discoverySource: "discovery_agent",
      discoveryUrl: "https://acme.fi",
      stageError: null,
      discoveredAt: new Date("2026-06-07T12:00:00.000Z"),
      completedAt: null,
      createdAt: new Date("2026-06-07T12:00:00.000Z"),
      updatedAt: new Date("2026-06-07T12:00:00.000Z"),
    },
  ];

  const company = {
    id: companyId,
    domain: "acme.fi",
    normalizedDomain: "acme.fi",
    name: "Acme Logistics Oy",
    websiteUrl: "https://acme.fi",
    firstSeenAt: new Date("2026-06-07T12:00:00.000Z"),
    lastCrawledAt: null,
    createdAt: new Date("2026-06-07T12:00:00.000Z"),
    updatedAt: new Date("2026-06-07T12:00:00.000Z"),
  };

  return {
    queryParser: {
      parse: vi.fn().mockResolvedValue(ok(criteria)),
    },
    companyDiscovery: {
      discover: vi.fn().mockResolvedValue(
        ok([{ companyName: "Acme Logistics Oy", website: "https://acme.fi" }]),
      ),
    },
    websiteCrawler: {
      crawl: vi.fn().mockResolvedValue(
        ok({
          companyId,
          domain: "acme.fi",
          baseUrl: "https://acme.fi",
          status: "partial",
          pagesSucceeded: 1,
          pagesAttempted: 5,
          durationMs: 100,
          pages: [
            {
              path: "/about",
              url: "https://acme.fi/about",
              httpStatus: 200,
              title: "About Acme",
              contentText: "Freight and warehousing provider established since 1998.",
              html: "<html><body><h1>About Acme Logistics</h1><p>Freight and warehousing provider established since 1998 in Finland with 150 employees.</p></body></html>",
              crawledAt: "2026-06-07T12:00:00.000Z",
            },
          ],
        }),
      ),
    },
    textCleaning: {
      clean: vi.fn().mockReturnValue(
        ok({
          body: "--- PAGE: /about ---\nCONTENT:\nFreight and warehousing provider established since 1998 in Finland with 150 employees and multiple logistics services.",
          metadata: {
            title: "About Acme",
            description: null,
            jsonLd: [],
            headings: [],
            language: "en",
          },
          stats: {
            inputBytes: 100,
            outputChars: 120,
            compressionRatio: 0.5,
            blocksRemoved: 0,
            sectionsPreserved: 1,
            lowQuality: false,
          },
          source: {
            url: "https://acme.fi/about",
            pagePath: "/about",
            cleanedAt: "2026-06-07T12:00:00.000Z",
          },
        }),
      ),
    },
    companyExtraction: {
      extract: vi.fn().mockResolvedValue(
        ok({
          profile: extractedProfile,
          meta: {
            promptVersion: "v1",
            modelUsed: "gpt-4o",
            contentHash: "hash-123",
            extractedAt: "2026-06-07T12:00:00.000Z",
            completeness: 0.9,
          },
        }),
      ),
    },
    leadScoring: {
      score: vi.fn().mockResolvedValue(
        ok({
          leadScore: {
            score: 88.15,
            confidence: 0.91,
            explanation: "Strong logistics fit with aligned employee range.",
            breakdown: {
              industryFit: {
                score: 100,
                weight: 0.3,
                weightedScore: 30,
                confidence: 0.95,
                rationale: "Exact industry match.",
                signals: [],
              },
              sizeFit: {
                score: 95,
                weight: 0.25,
                weightedScore: 23.75,
                confidence: 0.9,
                rationale: "Strong overlap.",
                signals: [],
              },
              businessMaturity: {
                score: 80,
                weight: 0.25,
                weightedScore: 20,
                confidence: 0.8,
                rationale: "Mature profile.",
                signals: [],
              },
              growthIndicators: {
                score: 60,
                weight: 0.2,
                weightedScore: 12,
                confidence: 0.7,
                rationale: "Moderate growth.",
                signals: [],
              },
            },
          },
          meta: {
            promptVersion: "v1",
            modelUsed: "gpt-4o",
            scoredAt: "2026-06-07T12:00:00.000Z",
            weights: {
              industryFit: 0.3,
              sizeFit: 0.25,
              businessMaturity: 0.25,
              growthIndicators: 0.2,
            },
          },
        }),
      ),
    },
    searchRepository: {
      createJob: vi.fn().mockResolvedValue({
        id: searchJobId,
        userId,
        query: "Find logistics companies in Finland with 50-200 employees",
        criteria: {},
        status: "PENDING",
        companyLimit: 25,
        errorMessage: null,
        startedAt: null,
        completedAt: null,
        createdAt: new Date("2026-06-07T12:00:00.000Z"),
        updatedAt: new Date("2026-06-07T12:00:00.000Z"),
      }),
      findJobById: vi.fn(),
      updateJobStatus: vi.fn().mockImplementation((_id, status) =>
        Promise.resolve({
          id: searchJobId,
          userId,
          query: "Find logistics companies in Finland with 50-200 employees",
          criteria,
          status,
          companyLimit: 25,
          errorMessage: null,
          startedAt: new Date("2026-06-07T12:00:00.000Z"),
          completedAt: status === "COMPLETED" ? new Date("2026-06-07T12:05:00.000Z") : null,
          createdAt: new Date("2026-06-07T12:00:00.000Z"),
          updatedAt: new Date("2026-06-07T12:05:00.000Z"),
        }),
      ),
      updateJobCriteria: vi.fn().mockResolvedValue({}),
      addDiscoveredCompanies: vi.fn().mockResolvedValue({
        companies: [company],
        searchResults,
        skippedDuplicates: 0,
      }),
      findResultsByJobId: vi.fn().mockImplementation((_jobId, options) => {
        if (options?.stage === "CRAWLED") {
          return Promise.resolve(searchResults.map((result) => ({ ...result, stage: "CRAWLED" as const })));
        }

        if (options?.stage === "EXTRACTED") {
          return Promise.resolve(searchResults.map((result) => ({ ...result, stage: "EXTRACTED" as const })));
        }

        return Promise.resolve(searchResults);
      }),
      updateResultStage: vi.fn().mockImplementation((input) =>
        Promise.resolve({
          ...searchResults[0]!,
          stage: input.stage,
          stageError: input.stageError ?? null,
        }),
      ),
      findResultById: vi.fn(),
    },
    companyRepository: {
      findById: vi.fn().mockResolvedValue(company),
      findByNormalizedDomain: vi.fn(),
      upsertByDomain: vi.fn(),
      upsertManyByDomain: vi.fn(),
      saveProfile: vi.fn().mockResolvedValue({
        profile: {
          id: "00000000-0000-4000-8000-000000000020",
          companyId,
          version: 1,
          structuredData: extractedProfile,
          completeness: 0.9,
          modelUsed: "gpt-4o",
          promptVersion: "v1",
          contentHash: "hash-123",
          extractedAt: new Date("2026-06-07T12:00:00.000Z"),
          createdAt: new Date("2026-06-07T12:00:00.000Z"),
          updatedAt: new Date("2026-06-07T12:00:00.000Z"),
        },
        created: true,
      }),
      findLatestProfile: vi.fn(),
      markCrawled: vi.fn().mockResolvedValue({ ...company, lastCrawledAt: new Date("2026-06-07T12:01:00.000Z") }),
    },
    leadRepository: {
      saveScore: vi.fn().mockResolvedValue({
        leadScore: {
          id: "00000000-0000-4000-8000-000000000050",
          searchResultId,
          searchJobId,
          totalScore: 88.15,
          confidence: 0.91,
          breakdown: {},
          rationale: "Strong logistics fit.",
          modelUsed: "gpt-4o",
          promptVersion: "v1",
          scoredAt: new Date("2026-06-07T12:00:00.000Z"),
          createdAt: new Date("2026-06-07T12:00:00.000Z"),
          updatedAt: new Date("2026-06-07T12:00:00.000Z"),
        },
        created: true,
      }),
      findBySearchResultId: vi.fn(),
      findRankedBySearchJobId: vi.fn(),
    },
    ...overrides,
  };
}

describe("SearchOrchestrator", () => {
  it("runs the full search pipeline successfully", async () => {
    const deps = createDependencies();
    const orchestrator = new SearchOrchestrator(deps, { maxAttempts: 1 });

    const result = await orchestrator.run({
      userId,
      query: "Find logistics companies in Finland with 50-200 employees",
    });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value.status).toBe("COMPLETED");
      expect(result.value.summary.discovered).toBe(1);
      expect(result.value.summary.crawled).toBe(1);
      expect(result.value.summary.extracted).toBe(1);
      expect(result.value.summary.scored).toBe(1);
      expect(result.value.summary.failed).toBe(0);
    }

    expect(deps.searchRepository.updateJobStatus).toHaveBeenCalledWith(
      searchJobId,
      "DISCOVERING",
      expect.any(Object),
    );
    expect(deps.leadRepository.saveScore).toHaveBeenCalledOnce();
  });

  it("retries query parsing before failing the job", async () => {
    const deps = createDependencies();
    deps.queryParser.parse = vi
      .fn()
      .mockResolvedValueOnce(err(new QueryParserError("VALIDATION_ERROR", "invalid")))
      .mockResolvedValueOnce(ok(criteria));

    const orchestrator = new SearchOrchestrator(deps, {
      maxAttempts: 2,
      initialDelayMs: 1,
    });

    const result = await orchestrator.run({
      userId,
      query: "Find logistics companies in Finland",
    });

    expect(result.ok).toBe(true);
    expect(deps.queryParser.parse).toHaveBeenCalledTimes(2);
  });

  it("fails the job when query parsing exhausts retries", async () => {
    const deps = createDependencies();
    deps.queryParser.parse = vi
      .fn()
      .mockResolvedValue(err(new QueryParserError("VALIDATION_ERROR", "invalid query")));

    const orchestrator = new SearchOrchestrator(deps, {
      maxAttempts: 2,
      initialDelayMs: 1,
    });

    const result = await orchestrator.run({
      userId,
      query: "bad",
    });

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.error.code).toBe("QUERY_PARSE_FAILED");
    }

    expect(deps.searchRepository.updateJobStatus).toHaveBeenCalledWith(
      searchJobId,
      "FAILED",
      expect.objectContaining({ errorMessage: expect.any(String) }),
    );
  });

  it("continues when one company crawl fails and completes with partial failures", async () => {
    const secondResultId = "00000000-0000-4000-8000-000000000041";
    const secondCompanyId = "00000000-0000-4000-8000-000000000011";

    const deps = createDependencies();
    const searchResults = [
      {
        id: searchResultId,
        searchJobId,
        companyId,
        stage: "DISCOVERED" as const,
        rank: 1,
        discoverySource: "discovery_agent",
        discoveryUrl: "https://acme.fi",
        stageError: null,
        discoveredAt: new Date("2026-06-07T12:00:00.000Z"),
        completedAt: null,
        createdAt: new Date("2026-06-07T12:00:00.000Z"),
        updatedAt: new Date("2026-06-07T12:00:00.000Z"),
      },
      {
        id: secondResultId,
        searchJobId,
        companyId: secondCompanyId,
        stage: "DISCOVERED" as const,
        rank: 2,
        discoverySource: "discovery_agent",
        discoveryUrl: "https://beta.fi",
        stageError: null,
        discoveredAt: new Date("2026-06-07T12:00:00.000Z"),
        completedAt: null,
        createdAt: new Date("2026-06-07T12:00:00.000Z"),
        updatedAt: new Date("2026-06-07T12:00:00.000Z"),
      },
    ];

    deps.searchRepository.addDiscoveredCompanies = vi.fn().mockResolvedValue({
      companies: [],
      searchResults,
      skippedDuplicates: 0,
    });

    deps.searchRepository.findResultsByJobId = vi.fn().mockImplementation((_jobId, options) => {
      if (options?.stage === "CRAWLED") {
        return Promise.resolve([{ ...searchResults[0]!, stage: "CRAWLED" as const }]);
      }

      if (options?.stage === "EXTRACTED") {
        return Promise.resolve([{ ...searchResults[0]!, stage: "EXTRACTED" as const }]);
      }

      return Promise.resolve(searchResults);
    });

    deps.companyRepository.findById = vi.fn().mockImplementation((id: string) => {
      if (id === companyId) {
        return Promise.resolve({
          id: companyId,
          domain: "acme.fi",
          normalizedDomain: "acme.fi",
          name: "Acme Logistics Oy",
          websiteUrl: "https://acme.fi",
          firstSeenAt: new Date("2026-06-07T12:00:00.000Z"),
          lastCrawledAt: null,
          createdAt: new Date("2026-06-07T12:00:00.000Z"),
          updatedAt: new Date("2026-06-07T12:00:00.000Z"),
        });
      }

      return Promise.resolve({
        id: secondCompanyId,
        domain: "beta.fi",
        normalizedDomain: "beta.fi",
        name: "Beta Oy",
        websiteUrl: null,
        firstSeenAt: new Date("2026-06-07T12:00:00.000Z"),
        lastCrawledAt: null,
        createdAt: new Date("2026-06-07T12:00:00.000Z"),
        updatedAt: new Date("2026-06-07T12:00:00.000Z"),
      });
    });

    const orchestrator = new SearchOrchestrator(deps, { maxAttempts: 1 });
    const result = await orchestrator.run({
      userId,
      query: "Find logistics companies in Finland",
    });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value.status).toBe("COMPLETED");
      expect(result.value.summary.crawled).toBe(1);
      expect(result.value.summary.scored).toBe(1);
      expect(result.value.summary.failed).toBe(1);
      expect(result.value.failures).toHaveLength(1);
      expect(result.value.failures[0]?.stage).toBe("CRAWL_FAILED");
    }
  });

  it("marks job failed when discovery returns no companies", async () => {
    const deps = createDependencies();
    deps.companyDiscovery.discover = vi.fn().mockResolvedValue(ok([]));

    const orchestrator = new SearchOrchestrator(deps, { maxAttempts: 1 });
    const result = await orchestrator.run({
      userId,
      query: "Find logistics companies in Finland",
    });

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.error.code).toBe("NO_COMPANIES_DISCOVERED");
    }
  });

  it("rejects invalid input", async () => {
    const orchestrator = new SearchOrchestrator(createDependencies(), { maxAttempts: 1 });

    const result = await orchestrator.run({
      userId: " ",
      query: "",
    });

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_INPUT");
    }
  });
});
