import { describe, expect, it, vi } from "vitest";
import { SearchApiService } from "@/services/application/search-api.service.js";
import { ApiError } from "@/lib/api/api-error.js";
import type { SearchApiServiceDependencies } from "@/services/application/search-api.service.js";

const userId = "00000000-0000-4000-8000-000000000001";
const searchJobId = "00000000-0000-4000-8000-000000000030";

function createJob(overrides: Partial<ReturnType<typeof baseJob>> = {}) {
  return { ...baseJob(), ...overrides };
}

function baseJob() {
  return {
    id: searchJobId,
    userId,
    query: "logistics companies in Finland",
    criteria: {},
    status: "PENDING" as const,
    companyLimit: null,
    errorMessage: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date("2026-06-07T12:00:00.000Z"),
    updatedAt: new Date("2026-06-07T12:00:00.000Z"),
  };
}

function createDependencies(
  overrides: Partial<SearchApiServiceDependencies> = {},
): SearchApiServiceDependencies {
  return {
    searchRepository: {
      createJob: vi.fn().mockImplementation((input) =>
        Promise.resolve(
          createJob({
            companyLimit: input.companyLimit ?? null,
          }),
        ),
      ),
      findJobByIdForUser: vi.fn().mockResolvedValue(createJob()),
      countResultsByStage: vi.fn().mockResolvedValue({}),
      countActiveJobsForUser: vi.fn().mockResolvedValue(0),
    } as unknown as SearchApiServiceDependencies["searchRepository"],
    leadRepository: {
      findResultsWithDetailsForJob: vi.fn().mockResolvedValue([]),
    } as unknown as SearchApiServiceDependencies["leadRepository"],
    searchOrchestrator: {
      run: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    } as unknown as SearchApiServiceDependencies["searchOrchestrator"],
    staleSearchJobCleanup: {
      cleanup: vi.fn().mockResolvedValue({ failedJobIds: [] }),
    } as unknown as SearchApiServiceDependencies["staleSearchJobCleanup"],
    ...overrides,
  };
}

describe("SearchApiService", () => {
  it("creates a search job and returns 202 payload shape", async () => {
    const deps = createDependencies();
    const service = new SearchApiService(deps);

    const result = await service.createSearch(userId, {
      query: "logistics companies in Finland",
      companyLimit: 10,
    });

    expect(result.id).toBe(searchJobId);
    expect(result.status).toBe("PENDING");
    expect(result.companyLimit).toBe(10);
    expect(result.links.self).toBe(`/api/v1/search/${searchJobId}`);
    expect(deps.searchRepository.createJob).toHaveBeenCalledWith({
      userId,
      query: "logistics companies in Finland",
      companyLimit: 10,
    });
  });

  it("cleans up stale jobs before enforcing concurrency limits", async () => {
    const cleanup = vi.fn().mockResolvedValue({
      failedJobIds: ["00000000-0000-4000-8000-000000000099"],
    });
    const deps = createDependencies({
      staleSearchJobCleanup: {
        cleanup,
      } as unknown as SearchApiServiceDependencies["staleSearchJobCleanup"],
    });
    const service = new SearchApiService(deps);

    await service.createSearch(userId, { query: "logistics companies in Finland" });

    expect(cleanup).toHaveBeenCalledWith({ userId });
    expect(deps.searchRepository.countActiveJobsForUser).toHaveBeenCalledWith(userId);
  });

  it("starts background orchestration for accepted searches", async () => {
    const deps = createDependencies();
    const service = new SearchApiService(deps);

    await service.createSearch(userId, { query: "SaaS startups" });
    await Promise.resolve();

    expect(deps.searchOrchestrator.run).toHaveBeenCalledWith({
      userId,
      query: "SaaS startups",
      companyLimit: undefined,
      searchJobId,
    });
  });

  it("throws not found when search job is inaccessible", async () => {
    const deps = createDependencies({
      searchRepository: {
        createJob: vi.fn(),
        findJobByIdForUser: vi.fn().mockResolvedValue(null),
        countResultsByStage: vi.fn(),
      } as unknown as SearchApiServiceDependencies["searchRepository"],
    });
    const service = new SearchApiService(deps);

    await expect(
      service.getSearch(userId, searchJobId, { includeFailures: true }),
    ).rejects.toMatchObject({
      status: 404,
      code: "NOT_FOUND",
    } satisfies Partial<ApiError>);
  });

  it("returns mapped search details for owned jobs", async () => {
    const deps = createDependencies({
      searchRepository: {
        createJob: vi.fn(),
        findJobByIdForUser: vi.fn().mockResolvedValue(
          createJob({ status: "COMPLETED", criteria: { industry: "logistics" } }),
        ),
        countResultsByStage: vi.fn().mockResolvedValue({ ENRICHED: 1 }),
      } as unknown as SearchApiServiceDependencies["searchRepository"],
      leadRepository: {
        findResultsWithDetailsForJob: vi.fn().mockResolvedValue([
          {
            searchResultId: "00000000-0000-4000-8000-000000000040",
            searchJobId,
            companyId: "00000000-0000-4000-8000-000000000010",
            rank: 1,
            stage: "ENRICHED",
            stageError: null,
            discoveredAt: new Date("2026-06-07T12:00:00.000Z"),
            completedAt: new Date("2026-06-07T12:01:00.000Z"),
            company: {
              id: "00000000-0000-4000-8000-000000000010",
              domain: "acme.fi",
              normalizedDomain: "acme.fi",
              name: "Acme Logistics Oy",
              websiteUrl: "https://acme.fi",
              firstSeenAt: new Date("2026-06-07T12:00:00.000Z"),
              lastCrawledAt: null,
              createdAt: new Date("2026-06-07T12:00:00.000Z"),
              updatedAt: new Date("2026-06-07T12:00:00.000Z"),
            },
            profile: null,
          },
        ]),
      } as unknown as SearchApiServiceDependencies["leadRepository"],
    });
    const service = new SearchApiService(deps);

    const result = await service.getSearch(userId, searchJobId, {
      includeFailures: true,
    });

    expect(result.id).toBe(searchJobId);
    expect(result.status).toBe("COMPLETED");
    expect(result.summary.enriched).toBe(1);
    expect(result.results).toHaveLength(1);
  });
});
