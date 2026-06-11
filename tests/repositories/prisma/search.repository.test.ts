import { describe, expect, it } from "vitest";
import { PrismaSearchRepository } from "@/repositories/prisma/search.repository.js";
import { RepositoryError } from "@/types/repositories/repository-error.types.js";
import {
  createMockCompany,
  createMockCompanyRepository,
  createMockPrismaClient,
  createMockSearchJob,
  createMockSearchResult,
  createUniqueConstraintError,
  toCompanyRecord,
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
    expect(prisma.searchJob.create).toHaveBeenCalledWith({
      data: {
        userId: job.userId,
        query: job.query,
        criteria: job.criteria,
        companyLimit: null,
        status: "PENDING",
      },
    });
  });

  it("adds discovered companies with deduplication in a transaction", async () => {
    const prisma = createMockPrismaClient();
    const job = createMockSearchJob();
    const company = toCompanyRecord(createMockCompany());

    prisma.searchJob.findUnique.mockResolvedValue({ id: job.id });
    prisma.searchResult.create
      .mockResolvedValueOnce(createMockSearchResult())
      .mockRejectedValueOnce(createUniqueConstraintError());

    const companyRepository = createMockCompanyRepository({
      companies: [company],
      createdCount: 1,
      updatedCount: 0,
    });
    const repository = new PrismaSearchRepository(prisma, companyRepository);

    const result = await repository.addDiscoveredCompanies(job.id, [
      {
        companyName: "Acme Logistics Oy",
        website: "https://acme.fi",
        discoverySource: "discovery_agent",
      },
      {
        companyName: "Acme Logistics Oy",
        website: "https://www.acme.fi",
        discoverySource: "discovery_agent",
      },
    ]);

    expect(result.companies).toHaveLength(1);
    expect(result.searchResults).toHaveLength(1);
    expect(result.skippedDuplicates).toBe(1);
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(companyRepository.upsertManyByDomain).toHaveBeenCalledWith(
      [
        { website: "https://acme.fi", name: "Acme Logistics Oy" },
        { website: "https://www.acme.fi", name: "Acme Logistics Oy" },
      ],
      prisma,
    );
  });

  it("skips duplicate search results for the same company and job", async () => {
    const prisma = createMockPrismaClient();
    const job = createMockSearchJob();
    const company = toCompanyRecord(createMockCompany());

    prisma.searchJob.findUnique.mockResolvedValue({ id: job.id });
    prisma.searchResult.create
      .mockResolvedValueOnce(createMockSearchResult())
      .mockRejectedValueOnce(createUniqueConstraintError());

    const companyRepository = createMockCompanyRepository({
      companies: [company],
      createdCount: 1,
      updatedCount: 0,
    });
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
    expect(prisma.searchResult.create).toHaveBeenCalledTimes(2);
  });

  it("throws when search job does not exist", async () => {
    const prisma = createMockPrismaClient();

    prisma.searchJob.findUnique.mockResolvedValue(null);

    const repository = new PrismaSearchRepository(prisma);

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

  it("deletes a search result", async () => {
    const prisma = createMockPrismaClient();
    const searchResult = createMockSearchResult({ id: "00000000-0000-4000-8000-000000000041" });

    prisma.searchResult.delete.mockResolvedValue(searchResult);

    const repository = new PrismaSearchRepository(prisma);
    await repository.deleteResult(searchResult.id);

    expect(prisma.searchResult.delete).toHaveBeenCalledWith({
      where: { id: searchResult.id },
    });
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

  it("fails stale pending and active jobs", async () => {
    const prisma = createMockPrismaClient();
    const staleJob = createMockSearchJob({ status: "PENDING" });
    const failedJob = {
      ...staleJob,
      status: "FAILED" as const,
      errorMessage: "Search timed out or was interrupted. Start a new search.",
      completedAt: new Date("2026-06-09T12:00:00.000Z"),
    };

    prisma.searchJob.findMany
      .mockResolvedValueOnce([{ id: staleJob.id }])
      .mockResolvedValueOnce([failedJob]);
    prisma.searchJob.updateMany.mockResolvedValue({ count: 1 });

    const repository = new PrismaSearchRepository(prisma);
    const result = await repository.failStaleJobs({
      userId: staleJob.userId,
      pendingStaleBefore: new Date("2026-06-09T11:55:00.000Z"),
      activeStaleBefore: new Date("2026-06-09T11:40:00.000Z"),
      errorMessage: "Search timed out or was interrupted. Start a new search.",
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.status).toBe("FAILED");
    expect(prisma.searchJob.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [staleJob.id] } },
      data: {
        status: "FAILED",
        errorMessage: "Search timed out or was interrupted. Start a new search.",
        completedAt: expect.any(Date),
      },
    });
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
