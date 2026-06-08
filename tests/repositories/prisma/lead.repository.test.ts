import { describe, expect, it } from "vitest";
import { PrismaLeadRepository } from "@/repositories/prisma/lead.repository.js";
import {
  createMockCompany,
  createMockCompanyProfile,
  createMockLeadScore,
  createMockPrismaClient,
  createMockSearchResult,
} from "./test-helpers.js";

describe("PrismaLeadRepository", () => {
  it("saves lead score and marks search result as scored in a transaction", async () => {
    const prisma = createMockPrismaClient();
    const leadScore = createMockLeadScore();

    prisma.leadScore.findUnique.mockResolvedValue(null);
    prisma.leadScore.upsert.mockResolvedValue(leadScore);
    prisma.searchResult.update.mockResolvedValue(createMockSearchResult());

    const repository = new PrismaLeadRepository(prisma);
    const result = await repository.saveScore({
      searchResultId: leadScore.searchResultId,
      searchJobId: leadScore.searchJobId,
      totalScore: 88.15,
      confidence: 0.91,
      breakdown: leadScore.breakdown,
      rationale: leadScore.rationale,
      modelUsed: "gpt-4o",
      promptVersion: "v1",
    });

    expect(result.created).toBe(true);
    expect(result.leadScore.totalScore).toBe(88.15);
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(prisma.searchResult.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: leadScore.searchResultId },
        data: expect.objectContaining({ stage: "SCORED" }),
      }),
    );
  });

  it("updates existing lead score on duplicate save", async () => {
    const prisma = createMockPrismaClient();
    const leadScore = createMockLeadScore();

    prisma.leadScore.findUnique.mockResolvedValue(leadScore);
    prisma.leadScore.upsert.mockResolvedValue(leadScore);
    prisma.searchResult.update.mockResolvedValue(createMockSearchResult());

    const repository = new PrismaLeadRepository(prisma);
    const result = await repository.saveScore({
      searchResultId: leadScore.searchResultId,
      searchJobId: leadScore.searchJobId,
      totalScore: 90,
      confidence: 0.95,
      breakdown: leadScore.breakdown,
      rationale: "Updated rationale with stronger fit across all scoring factors.",
    });

    expect(result.created).toBe(false);
    expect(prisma.leadScore.upsert).toHaveBeenCalledOnce();
  });

  it("returns ranked leads with latest company profile", async () => {
    const prisma = createMockPrismaClient();
    const company = createMockCompany();
    const profile = createMockCompanyProfile();
    const leadScore = createMockLeadScore();
    const searchResult = createMockSearchResult();

    prisma.searchResult.findMany.mockResolvedValue([
      {
        ...searchResult,
        company,
        leadScore,
      },
    ]);
    prisma.companyProfile.findMany.mockResolvedValue([profile]);

    const repository = new PrismaLeadRepository(prisma);
    const results = await repository.findRankedBySearchJobId(searchResult.searchJobId, {
      limit: 10,
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.company.normalizedDomain).toBe("acme.fi");
    expect(results[0]?.profile?.version).toBe(1);
    expect(results[0]?.leadScore?.totalScore).toBe(88.15);
  });
});
