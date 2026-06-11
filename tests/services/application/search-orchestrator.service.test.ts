import { describe, expect, it, vi } from "vitest";
import { QueryParserError, LeadEnrichmentError } from "@/types/agents/agent-error.types.js";
import { WebsiteCrawlerError } from "@/types/crawler/crawler-error.types.js";
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

import { createExtractedCompanyProfile } from "../../helpers/extracted-company.fixture.js";

const extractedProfile = createExtractedCompanyProfile();

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
    leadEnrichment: {
      enrich: vi.fn().mockResolvedValue(
        ok({
          profile: {
            ...extractedProfile,
            city: "helsinki",
            country: "finland",
            decisionMaker: "Jane Doe, CEO",
            linkedInUrl: "https://linkedin.com/company/acme",
            email: "info@acme.fi",
          },
          meta: {
            promptVersion: "v1",
            modelUsed: "gpt-4o",
            enrichedAt: "2026-06-07T12:02:00.000Z",
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
      deleteResult: vi.fn().mockResolvedValue(undefined),
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
    ...overrides,
  };
}

describe("SearchOrchestrator", () => {
  it("runs the hybrid enrichment pipeline successfully", async () => {
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
      expect(result.value.summary.crawled).toBe(0);
      expect(result.value.summary.extracted).toBe(0);
      expect(result.value.summary.enriched).toBe(1);
      expect(result.value.summary.failed).toBe(0);
    }

    expect(deps.searchRepository.updateJobStatus).toHaveBeenCalledWith(
      searchJobId,
      "DISCOVERING",
      expect.any(Object),
    );
    expect(deps.leadEnrichment.enrich).toHaveBeenCalledOnce();
    expect(deps.websiteCrawler.crawl).not.toHaveBeenCalled();
    expect(deps.companyRepository.saveProfile).toHaveBeenCalledOnce();
  });

  it("supplements web enrichment with contact-page crawl when outreach gaps remain", async () => {
    const deps = createDependencies();
    deps.leadEnrichment.enrich = vi.fn().mockResolvedValue(
      ok({
        profile: createExtractedCompanyProfile({
          city: "helsinki",
          country: "finland",
          decisionMaker: "unknown",
          linkedInUrl: null,
          email: null,
        }),
        meta: {
          promptVersion: "v1",
          modelUsed: "gpt-4o",
          enrichedAt: "2026-06-07T12:02:00.000Z",
        },
      }),
    );
    deps.companyExtraction.extract = vi.fn().mockResolvedValue(
      ok({
        profile: createExtractedCompanyProfile({
          decisionMaker: "Jane Doe, CEO",
          email: "info@acme.fi",
          linkedInUrl: "https://linkedin.com/company/acme",
        }),
        meta: {
          promptVersion: "v1",
          modelUsed: "gpt-4o",
          contentHash: "hash-contact",
          extractedAt: "2026-06-07T12:01:00.000Z",
          completeness: 0.8,
        },
      }),
    );

    const orchestrator = new SearchOrchestrator(deps, { maxAttempts: 1 });
    const result = await orchestrator.run({
      userId,
      query: "Find logistics companies in Finland with 50-200 employees",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.summary.crawled).toBe(1);
      expect(result.value.summary.extracted).toBe(1);
      expect(result.value.summary.enriched).toBe(1);
    }

    expect(deps.websiteCrawler.crawl).toHaveBeenCalledWith(
      expect.objectContaining({
        paths: ["/contact", "/about", "/team"],
      }),
    );
  });

  it("falls back to full website crawl when web enrichment fails", async () => {
    const deps = createDependencies();
    deps.leadEnrichment.enrich = vi.fn().mockResolvedValue(
      err(new LeadEnrichmentError("VALIDATION_ERROR", "estimatedCompanySize must match 50-200, 100+, or unknown")),
    );

    const orchestrator = new SearchOrchestrator(deps, { maxAttempts: 1 });
    const result = await orchestrator.run({
      userId,
      query: "Find logistics companies in Finland with 50-200 employees",
    });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value.summary.crawled).toBe(1);
      expect(result.value.summary.extracted).toBe(1);
      expect(result.value.summary.enriched).toBe(1);
      expect(result.value.summary.failed).toBe(0);
    }

    expect(deps.websiteCrawler.crawl).toHaveBeenCalledWith(
      expect.objectContaining({
        paths: ["/", "/about", "/company", "/contact", "/careers"],
      }),
    );
    expect(deps.companyExtraction.extract).toHaveBeenCalledOnce();
    expect(deps.companyRepository.saveProfile).toHaveBeenCalledOnce();
  });

  it("removes the search result when web enrichment and crawl fallback both fail", async () => {
    const deps = createDependencies();
    deps.leadEnrichment.enrich = vi.fn().mockResolvedValue(
      err(new LeadEnrichmentError("OPENAI_ERROR", "Rate limit exceeded")),
    );
    deps.websiteCrawler.crawl = vi.fn().mockResolvedValue(
      err(new WebsiteCrawlerError("CRAWL_FAILED", "All crawl paths failed")),
    );

    const orchestrator = new SearchOrchestrator(deps, { maxAttempts: 1 });
    const result = await orchestrator.run({
      userId,
      query: "Find logistics companies in Finland with 50-200 employees",
    });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value.status).toBe("FAILED");
      expect(result.value.summary.enriched).toBe(0);
      expect(result.value.summary.removed).toBe(1);
      expect(result.value.summary.failed).toBe(0);
      expect(result.value.failures[0]?.stage).toBe("REMOVED");
      expect(result.value.failures[0]?.message).toContain("Web enrichment failed");
      expect(result.value.failures[0]?.message).toContain("website crawl failed");
    }

    expect(deps.searchRepository.deleteResult).toHaveBeenCalledWith(searchResultId);
    expect(deps.searchRepository.updateResultStage).not.toHaveBeenCalledWith(
      expect.objectContaining({ stage: "ENRICH_FAILED" }),
    );
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

  it("runs contact crawl for multiple companies when outreach gaps remain", async () => {
    let activeCrawls = 0;
    let maxActiveCrawls = 0;

    const companyIds = [
      "00000000-0000-4000-8000-000000000010",
      "00000000-0000-4000-8000-000000000011",
      "00000000-0000-4000-8000-000000000012",
      "00000000-0000-4000-8000-000000000013",
    ];

    const searchResults = companyIds.map((id, index) => ({
      id: `00000000-0000-4000-8000-00000000004${index}`,
      searchJobId,
      companyId: id,
      stage: "DISCOVERED" as const,
      rank: index + 1,
      discoverySource: "discovery_agent",
      discoveryUrl: `https://company-${index}.fi`,
      stageError: null,
      discoveredAt: new Date("2026-06-07T12:00:00.000Z"),
      completedAt: null,
      createdAt: new Date("2026-06-07T12:00:00.000Z"),
      updatedAt: new Date("2026-06-07T12:00:00.000Z"),
    }));

    const deps = createDependencies();
    deps.leadEnrichment.enrich = vi.fn().mockResolvedValue(
      ok({
        profile: createExtractedCompanyProfile({
          decisionMaker: "unknown",
          linkedInUrl: null,
          email: null,
        }),
        meta: {
          promptVersion: "v1",
          modelUsed: "gpt-4o",
          enrichedAt: "2026-06-07T12:02:00.000Z",
        },
      }),
    );
    deps.companyDiscovery.discover = vi.fn().mockResolvedValue(
      ok(
        companyIds.map((_, index) => ({
          companyName: `Company ${index}`,
          website: `https://company-${index}.fi`,
        })),
      ),
    );
    deps.searchRepository.addDiscoveredCompanies = vi.fn().mockResolvedValue({
      companies: [],
      searchResults,
      skippedDuplicates: 0,
    });
    deps.searchRepository.findResultsByJobId = vi.fn().mockResolvedValue(searchResults);
    deps.companyRepository.findById = vi.fn().mockImplementation((id: string) => {
      const index = companyIds.indexOf(id);

      return Promise.resolve({
        id,
        domain: `company-${index}.fi`,
        normalizedDomain: `company-${index}.fi`,
        name: `Company ${index}`,
        websiteUrl: `https://company-${index}.fi`,
        firstSeenAt: new Date("2026-06-07T12:00:00.000Z"),
        lastCrawledAt: null,
        createdAt: new Date("2026-06-07T12:00:00.000Z"),
        updatedAt: new Date("2026-06-07T12:00:00.000Z"),
      });
    });
    deps.websiteCrawler.crawl = vi.fn().mockImplementation(async () => {
      activeCrawls += 1;
      maxActiveCrawls = Math.max(maxActiveCrawls, activeCrawls);
      await new Promise((resolve) => setTimeout(resolve, 30));
      activeCrawls -= 1;

      return ok({
        companyId: companyIds[0]!,
        domain: "company-0.fi",
        baseUrl: "https://company-0.fi",
        status: "partial",
        pagesSucceeded: 1,
        pagesAttempted: 5,
        durationMs: 30,
        pages: [
          {
            path: "/about",
            url: "https://company-0.fi/about",
            httpStatus: 200,
            title: "About",
            contentText: "Freight and warehousing provider established since 1998 in Finland.",
            html: "<html><body><p>Freight and warehousing provider established since 1998 in Finland with 150 employees.</p></body></html>",
            crawledAt: "2026-06-07T12:00:00.000Z",
          },
        ],
      });
    });

    const orchestrator = new SearchOrchestrator(deps, {
      maxAttempts: 1,
      enrichmentConcurrency: 3,
    });

    const result = await orchestrator.run({
      userId,
      query: "Find logistics companies in Finland",
    });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value.summary.crawled).toBe(4);
      expect(result.value.summary.extracted).toBe(4);
      expect(result.value.summary.enriched).toBe(4);
      expect(maxActiveCrawls).toBe(3);
    }

    expect(deps.websiteCrawler.crawl).toHaveBeenCalledTimes(4);
  });

  it("enriches multiple companies in parallel", async () => {
    let activeEnrichments = 0;
    let maxActiveEnrichments = 0;

    const companyIds = [
      "00000000-0000-4000-8000-000000000010",
      "00000000-0000-4000-8000-000000000011",
      "00000000-0000-4000-8000-000000000012",
      "00000000-0000-4000-8000-000000000013",
    ];

    const searchResults = companyIds.map((id, index) => ({
      id: `00000000-0000-4000-8000-00000000004${index}`,
      searchJobId,
      companyId: id,
      stage: "DISCOVERED" as const,
      rank: index + 1,
      discoverySource: "discovery_agent",
      discoveryUrl: `https://company-${index}.fi`,
      stageError: null,
      discoveredAt: new Date("2026-06-07T12:00:00.000Z"),
      completedAt: null,
      createdAt: new Date("2026-06-07T12:00:00.000Z"),
      updatedAt: new Date("2026-06-07T12:00:00.000Z"),
    }));

    const deps = createDependencies();
    deps.companyDiscovery.discover = vi.fn().mockResolvedValue(
      ok(
        companyIds.map((_, index) => ({
          companyName: `Company ${index}`,
          website: `https://company-${index}.fi`,
        })),
      ),
    );
    deps.searchRepository.addDiscoveredCompanies = vi.fn().mockResolvedValue({
      companies: [],
      searchResults,
      skippedDuplicates: 0,
    });
    deps.searchRepository.findResultsByJobId = vi.fn().mockResolvedValue(searchResults);
    deps.companyRepository.findById = vi.fn().mockImplementation((id: string) => {
      const index = companyIds.indexOf(id);

      return Promise.resolve({
        id,
        domain: `company-${index}.fi`,
        normalizedDomain: `company-${index}.fi`,
        name: `Company ${index}`,
        websiteUrl: `https://company-${index}.fi`,
        firstSeenAt: new Date("2026-06-07T12:00:00.000Z"),
        lastCrawledAt: null,
        createdAt: new Date("2026-06-07T12:00:00.000Z"),
        updatedAt: new Date("2026-06-07T12:00:00.000Z"),
      });
    });
    deps.leadEnrichment.enrich = vi.fn().mockImplementation(async () => {
      activeEnrichments += 1;
      maxActiveEnrichments = Math.max(maxActiveEnrichments, activeEnrichments);
      await new Promise((resolve) => setTimeout(resolve, 30));
      activeEnrichments -= 1;

      return ok({
        profile: {
          ...extractedProfile,
          city: "helsinki",
          country: "finland",
          decisionMaker: "Jane Doe, CEO",
          linkedInUrl: "https://linkedin.com/company/acme",
          email: "info@acme.fi",
        },
        meta: {
          promptVersion: "v1",
          modelUsed: "gpt-4o",
          enrichedAt: "2026-06-07T12:02:00.000Z",
        },
      });
    });

    const orchestrator = new SearchOrchestrator(deps, {
      maxAttempts: 1,
      enrichmentConcurrency: 3,
    });

    const result = await orchestrator.run({
      userId,
      query: "Find logistics companies in Finland",
    });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value.summary.crawled).toBe(0);
      expect(result.value.summary.enriched).toBe(4);
      expect(maxActiveEnrichments).toBe(3);
    }

    expect(deps.websiteCrawler.crawl).not.toHaveBeenCalled();
    expect(deps.leadEnrichment.enrich).toHaveBeenCalledTimes(4);
  });

  it("removes failed leads and completes when at least one company enriches", async () => {
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

    deps.searchRepository.findResultsByJobId = vi.fn().mockResolvedValue(searchResults);

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
      expect(result.value.summary.enriched).toBe(1);
      expect(result.value.summary.removed).toBe(1);
      expect(result.value.summary.failed).toBe(0);
      expect(result.value.failures).toHaveLength(1);
      expect(result.value.failures[0]?.stage).toBe("REMOVED");
    }

    expect(deps.searchRepository.deleteResult).toHaveBeenCalledWith(secondResultId);
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
