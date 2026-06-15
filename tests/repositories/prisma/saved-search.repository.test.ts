import { describe, expect, it, vi } from "vitest";
import { PrismaSavedSearchRepository } from "@/repositories/prisma/saved-search.repository.js";
import { createMockPrismaClient } from "./test-helpers.js";

function createPrismaWithSavedSearch() {
  return Object.assign(createMockPrismaClient(), {
    savedSearch: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    searchResult: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    campaignRecipient: {
      findMany: vi.fn(),
    },
  });
}

describe("PrismaSavedSearchRepository", () => {
  it("upserts saved searches by user and search job", async () => {
    const prisma = createPrismaWithSavedSearch();
    const userId = "00000000-0000-4000-8000-000000000001";

    prisma.savedSearch.upsert.mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000040",
      userId,
      searchJobId: "00000000-0000-4000-8000-000000000020",
      savedAt: new Date("2026-06-15T12:00:00.000Z"),
    });

    const repository = new PrismaSavedSearchRepository(prisma);
    const saved = await repository.upsert({
      userId,
      searchJobId: "00000000-0000-4000-8000-000000000020",
    });

    expect(saved.searchJobId).toBe("00000000-0000-4000-8000-000000000020");
  });

  it("lists saved searches with lead count and outreach status", async () => {
    const prisma = createPrismaWithSavedSearch();

    prisma.savedSearch.findMany.mockResolvedValue([
      {
        id: "00000000-0000-4000-8000-000000000040",
        userId: "00000000-0000-4000-8000-000000000001",
        searchJobId: "00000000-0000-4000-8000-000000000020",
        savedAt: new Date("2026-06-15T12:00:00.000Z"),
        searchJob: {
          id: "00000000-0000-4000-8000-000000000020",
          query: "logistics companies in Finland",
          status: "COMPLETED",
        },
      },
    ]);
    prisma.searchResult.count.mockResolvedValue(8);
    prisma.searchResult.findMany.mockResolvedValue([{ id: "result-1" }]);
    prisma.campaignRecipient.findMany.mockResolvedValue([]);

    const repository = new PrismaSavedSearchRepository(prisma);
    const results = await repository.listForUser("00000000-0000-4000-8000-000000000001");

    expect(results).toHaveLength(1);
    expect(results[0]?.leadCount).toBe(8);
    expect(results[0]?.outreachStatus).toBe("NOT_STARTED");
  });
});
