import { describe, expect, it } from "vitest";
import { PrismaCompanyRepository } from "@/repositories/prisma/company.repository.js";
import { PrismaSearchRepository } from "@/repositories/prisma/search.repository.js";
import { RepositoryError } from "@/types/repositories/repository-error.types.js";
import {
  createMockCompany,
  createMockPrismaClient,
  createMockSearchJob,
  createMockSearchResult,
  createUniqueConstraintError,
} from "./test-helpers.js";

describe("PrismaSearchRepository", () => {
  it("creates a pending search job", async () => {
    const prisma = createMockPrismaClient();
    const job = createMockSearchJob();

    prisma.searchJob.create.mockResolvedValue(job);

    const repository = new PrismaSearchRepository(prisma);
    const result = await repository.createJob({
      userId: job.userId,
      query: job.query,
      criteria: job.criteria,
    });

    expect(result.status).toBe("PENDING");
    expect(result.query).toBe(job.query);
  });

  it("adds discovered companies with deduplication in a transaction", async () => {
    const prisma = createMockPrismaClient();
    const job = createMockSearchJob();
    const company = createMockCompany();

    prisma.searchJob.findUnique.mockResolvedValue({ id: job.id });
    prisma.company.findUnique.mockResolvedValue(null);
    prisma.company.upsert.mockResolvedValue(company);
    prisma.searchResult.create
      .mockResolvedValueOnce(createMockSearchResult())
      .mockRejectedValueOnce(createUniqueConstraintError());

    const companyRepository = new PrismaCompanyRepository(prisma);
    const repository = new PrismaSearchRepository(prisma, companyRepository);

    const result = await repository.addDiscoveredCompanies(job.id, [
      {
        companyName: "Acme Logistics Oy",
        website: "https://acme.fi",
        discoverySource: "wikidata",
      },
      {
        companyName: "Acme Logistics Oy",
        website: "https://www.acme.fi",
        discoverySource: "duckduckgo_html",
      },
    ]);

    expect(result.companies).toHaveLength(1);
    expect(result.searchResults).toHaveLength(1);
    expect(result.skippedDuplicates).toBe(1);
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });

  it("skips duplicate search results for the same company and job", async () => {
    const prisma = createMockPrismaClient();
    const job = createMockSearchJob();
    const company = createMockCompany();

    prisma.searchJob.findUnique.mockResolvedValue({ id: job.id });
    prisma.company.findUnique.mockResolvedValue(null);
    prisma.company.upsert.mockResolvedValue(company);
    prisma.searchResult.create
      .mockResolvedValueOnce(createMockSearchResult())
      .mockRejectedValueOnce(createUniqueConstraintError());

    const companyRepository = new PrismaCompanyRepository(prisma);
    const repository = new PrismaSearchRepository(prisma, companyRepository);

    const result = await repository.addDiscoveredCompanies(job.id, [
      {
        companyName: "Acme Logistics Oy",
        website: "https://acme.fi",
      },
      {
        companyName: "Acme Logistics Oy",
        website: "https://acme.fi/contact",
      },
    ]);

    expect(result.searchResults).toHaveLength(1);
    expect(result.skippedDuplicates).toBe(1);
  });

  it("throws when search job does not exist", async () => {
    const prisma = createMockPrismaClient();

    prisma.searchJob.findUnique.mockResolvedValue(null);

    const companyRepository = new PrismaCompanyRepository(prisma);
    const repository = new PrismaSearchRepository(prisma, companyRepository);

    await expect(
      repository.addDiscoveredCompanies("00000000-0000-4000-8000-000000000099", [
        {
          companyName: "Acme Logistics Oy",
          website: "https://acme.fi",
        },
      ]),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    } satisfies Partial<RepositoryError>);
  });

  it("updates search result stage", async () => {
    const prisma = createMockPrismaClient();
    const searchResult = createMockSearchResult({ id: "00000000-0000-4000-8000-000000000041" });

    prisma.searchResult.update.mockResolvedValue({
      ...searchResult,
      stage: "CRAWLED",
    });

    const repository = new PrismaSearchRepository(prisma);
    const result = await repository.updateResultStage({
      searchResultId: searchResult.id,
      stage: "CRAWLED",
    });

    expect(result.stage).toBe("CRAWLED");
  });

  it("updates search job status and criteria", async () => {
    const prisma = createMockPrismaClient();
    const job = createMockSearchJob();

    prisma.searchJob.update.mockResolvedValue({
      ...job,
      status: "DISCOVERING",
      startedAt: new Date("2026-06-07T12:05:00.000Z"),
    });

    const repository = new PrismaSearchRepository(prisma);

    const statusResult = await repository.updateJobStatus(job.id, "DISCOVERING", {
      startedAt: new Date("2026-06-07T12:05:00.000Z"),
    });

    expect(statusResult.status).toBe("DISCOVERING");

    prisma.searchJob.update.mockResolvedValue({
      ...job,
      criteria: {
        industry: "logistics",
        location: "Finland",
        employeeRange: "50-200",
      },
    });

    const criteriaResult = await repository.updateJobCriteria(job.id, {
      industry: "logistics",
      location: "Finland",
      employeeRange: "50-200",
    });

    expect(criteriaResult.criteria).toMatchObject({
      industry: "logistics",
    });
  });
});
