import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/api-error.js";
import {
  SavedSearchApiService,
  type SavedSearchApiServiceDependencies,
} from "@/services/application/saved-search-api.service.js";

const user = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "rep@parijat.com",
  name: "Sales Rep",
  role: "SALES_REP" as const,
  organizationId: "00000000-0000-4000-8000-000000000010",
};

const searchJobId = "00000000-0000-4000-8000-000000000020";
const savedSearchId = "00000000-0000-4000-8000-000000000040";

function createDependencies(
  overrides: Partial<SavedSearchApiServiceDependencies> = {},
): SavedSearchApiServiceDependencies {
  return {
    savedSearchRepository: {
      listForUser: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue({
        id: savedSearchId,
        userId: user.id,
        searchJobId,
        savedAt: new Date("2026-06-15T12:00:00.000Z"),
      }),
      findByIdForUser: vi.fn(),
      findBySearchJobIdForUser: vi.fn(),
      deleteByIdForUser: vi.fn().mockResolvedValue(true),
    } as unknown as SavedSearchApiServiceDependencies["savedSearchRepository"],
    searchRepository: {
      findJobByIdForUser: vi.fn().mockResolvedValue({
        id: searchJobId,
        userId: user.id,
        query: "SaaS startups",
        criteria: {},
        status: "COMPLETED",
        companyLimit: null,
        errorMessage: null,
        startedAt: new Date(),
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    } as unknown as SavedSearchApiServiceDependencies["searchRepository"],
    ...overrides,
  };
}

describe("SavedSearchApiService", () => {
  it("lists saved searches for the current user", async () => {
    const deps = createDependencies({
      savedSearchRepository: {
        listForUser: vi.fn().mockResolvedValue([
          {
            id: savedSearchId,
            userId: user.id,
            searchJobId,
            savedAt: new Date("2026-06-15T12:00:00.000Z"),
            query: "SaaS startups",
            searchJobStatus: "COMPLETED",
            leadCount: 12,
            outreachStatus: "NOT_STARTED",
          },
        ]),
      } as unknown as SavedSearchApiServiceDependencies["savedSearchRepository"],
    });
    const service = new SavedSearchApiService(deps);

    const result = await service.listSavedSearches(user);

    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.searchJobId).toBe(searchJobId);
  });

  it("saves a completed search job", async () => {
    const deps = createDependencies();
    const service = new SavedSearchApiService(deps);

    const result = await service.saveSavedSearch(user, { searchJobId });

    expect(result.id).toBe(savedSearchId);
    expect(deps.savedSearchRepository.upsert).toHaveBeenCalledWith({
      userId: user.id,
      searchJobId,
    });
  });

  it("rejects saving incomplete searches", async () => {
    const deps = createDependencies({
      searchRepository: {
        findJobByIdForUser: vi.fn().mockResolvedValue({
          id: searchJobId,
          userId: user.id,
          query: "SaaS startups",
          criteria: {},
          status: "ENRICHING",
          companyLimit: null,
          errorMessage: null,
          startedAt: new Date(),
          completedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      } as unknown as SavedSearchApiServiceDependencies["searchRepository"],
    });
    const service = new SavedSearchApiService(deps);

    await expect(service.saveSavedSearch(user, { searchJobId })).rejects.toEqual(
      ApiError.validationError("Only completed searches can be saved."),
    );
  });

  it("deletes a saved search owned by the user", async () => {
    const deps = createDependencies();
    const service = new SavedSearchApiService(deps);

    const result = await service.deleteSavedSearch(user, savedSearchId);

    expect(result.deletedCount).toBe(1);
  });
});
