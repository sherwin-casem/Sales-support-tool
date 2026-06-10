import { describe, expect, it, vi } from "vitest";
import {
  STALE_SEARCH_JOB_ERROR_MESSAGE,
  StaleSearchJobCleanupService,
} from "@/services/application/stale-search-job-cleanup.service.js";
import type { SearchRepository } from "@/repositories/interfaces/search.repository.interface.js";

describe("StaleSearchJobCleanupService", () => {
  it("fails stale jobs using configured thresholds", async () => {
    const failStaleJobs = vi.fn().mockResolvedValue([
      {
        id: "00000000-0000-4000-8000-000000000030",
        userId: "00000000-0000-4000-8000-000000000001",
        query: "old search",
        criteria: {},
        status: "FAILED",
        companyLimit: 25,
        errorMessage: STALE_SEARCH_JOB_ERROR_MESSAGE,
        startedAt: null,
        completedAt: new Date("2026-06-09T12:00:00.000Z"),
        createdAt: new Date("2026-06-09T11:00:00.000Z"),
        updatedAt: new Date("2026-06-09T11:00:00.000Z"),
      },
    ]);

    const repository = {
      failStaleJobs,
    } as unknown as SearchRepository;

    const service = new StaleSearchJobCleanupService(repository);
    const result = await service.cleanup({
      userId: "00000000-0000-4000-8000-000000000001",
    });

    expect(result.failedJobIds).toEqual([
      "00000000-0000-4000-8000-000000000030",
    ]);
    expect(failStaleJobs).toHaveBeenCalledOnce();
    expect(failStaleJobs.mock.calls[0]?.[0]).toMatchObject({
      userId: "00000000-0000-4000-8000-000000000001",
      errorMessage: STALE_SEARCH_JOB_ERROR_MESSAGE,
    });
  });

  it("returns empty result when no stale jobs exist", async () => {
    const repository = {
      failStaleJobs: vi.fn().mockResolvedValue([]),
    } as unknown as SearchRepository;

    const service = new StaleSearchJobCleanupService(repository);
    const result = await service.cleanup();

    expect(result.failedJobIds).toEqual([]);
  });
});
