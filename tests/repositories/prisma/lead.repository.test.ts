import { describe, expect, it } from "vitest";
import { PrismaLeadRepository } from "@/repositories/prisma/lead.repository.js";
import {
  createMockCompany,
  createMockCompanyProfile,
  createMockPrismaClient,
  createMockSearchResult,
} from "./test-helpers.js";

describe("PrismaLeadRepository", () => {
  it("returns search results with latest company profile", async () => {
    const prisma = createMockPrismaClient();
    const company = createMockCompany();
    const profile = createMockCompanyProfile();
    const searchResult = createMockSearchResult();

    prisma.searchResult.findMany.mockResolvedValue([
      {
        ...searchResult,
        company,
      },
    ]);
    prisma.companyProfile.findMany.mockResolvedValue([profile]);

    const repository = new PrismaLeadRepository(prisma);
    const results = await repository.findResultsWithDetailsForJob(searchResult.searchJobId);

    expect(results).toHaveLength(1);
    expect(results[0]?.company.normalizedDomain).toBe("acme.fi");
    expect(results[0]?.profile?.version).toBe(1);
  });
});
