import { describe, expect, it, vi } from "vitest";
import { PrismaCompanyRepository } from "@/repositories/prisma/company.repository.js";
import { RepositoryError } from "@/types/repositories/repository-error.types.js";
import {
  createMockCompany,
  createMockCompanyProfile,
  createMockPrismaClient,
  createUniqueConstraintError,
} from "./test-helpers.js";

describe("PrismaCompanyRepository", () => {
  it("upserts company by normalized domain", async () => {
    const prisma = createMockPrismaClient();
    const company = createMockCompany();

    prisma.company.findUnique.mockResolvedValue(null);
    prisma.company.upsert.mockResolvedValue(company);

    const repository = new PrismaCompanyRepository(prisma);
    const result = await repository.upsertByDomain({
      website: "https://www.acme.fi/about",
      name: "Acme Logistics Oy",
    });

    expect(result.created).toBe(true);
    expect(result.company.normalizedDomain).toBe("acme.fi");
    expect(prisma.company.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { normalizedDomain: "acme.fi" },
      }),
    );
  });

  it("deduplicates companies in upsertManyByDomain transaction", async () => {
    const prisma = createMockPrismaClient();
    const company = createMockCompany();

    prisma.company.findUnique.mockResolvedValue(null);
    prisma.company.upsert.mockResolvedValue(company);

    const repository = new PrismaCompanyRepository(prisma);
    const result = await repository.upsertManyByDomain([
      { website: "https://acme.fi", name: "Acme Logistics Oy" },
      { website: "https://www.acme.fi", name: "Acme Logistics Oy" },
    ]);

    expect(result.companies).toHaveLength(1);
    expect(result.createdCount).toBe(1);
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(prisma.company.upsert).toHaveBeenCalledOnce();
  });

  it("skips duplicate profile versions when content hash already exists", async () => {
    const prisma = createMockPrismaClient();
    const profile = createMockCompanyProfile();

    prisma.companyProfile.findFirst.mockResolvedValue(profile);

    const repository = new PrismaCompanyRepository(prisma);
    const result = await repository.saveProfile({
      companyId: profile.companyId,
      structuredData: profile.structuredData,
      contentHash: "abc123",
      completeness: 0.9,
    });

    expect(result.created).toBe(false);
    expect(result.profile.contentHash).toBe("abc123");
    expect(prisma.companyProfile.create).not.toHaveBeenCalled();
  });

  it("creates a new profile version when content hash is new", async () => {
    const prisma = createMockPrismaClient();
    const profile = createMockCompanyProfile({ version: 2 });

    prisma.companyProfile.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ version: 1 });
    prisma.companyProfile.create.mockResolvedValue(profile);

    const repository = new PrismaCompanyRepository(prisma);
    const result = await repository.saveProfile({
      companyId: profile.companyId,
      structuredData: profile.structuredData,
      contentHash: "new-hash",
      completeness: 0.9,
    });

    expect(result.created).toBe(true);
    expect(result.profile.version).toBe(2);
    expect(prisma.companyProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          version: 2,
          contentHash: "new-hash",
        }),
      }),
    );
  });

  it("handles concurrent profile version conflicts", async () => {
    const prisma = createMockPrismaClient();
    const profile = createMockCompanyProfile();

    prisma.companyProfile.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ version: 1 });
    prisma.companyProfile.create.mockRejectedValue(createUniqueConstraintError());
    prisma.companyProfile.findUnique.mockResolvedValue(profile);

    const repository = new PrismaCompanyRepository(prisma);
    const result = await repository.saveProfile({
      companyId: profile.companyId,
      structuredData: profile.structuredData,
      contentHash: "new-hash",
    });

    expect(result.created).toBe(false);
    expect(result.profile.id).toBe(profile.id);
  });

  it("rejects blocked domains", async () => {
    const prisma = createMockPrismaClient();
    const repository = new PrismaCompanyRepository(prisma);

    await expect(
      repository.upsertByDomain({
        website: "https://linkedin.com/company/acme",
        name: "Acme",
      }),
    ).rejects.toMatchObject({
      code: "INVALID_INPUT",
    } satisfies Partial<RepositoryError>);
  });

  it("marks company as crawled", async () => {
    const prisma = createMockPrismaClient();
    const crawledAt = new Date("2026-06-07T13:00:00.000Z");
    const company = createMockCompany();

    prisma.company.update.mockResolvedValue({
      ...company,
      lastCrawledAt: crawledAt,
    });

    const repository = new PrismaCompanyRepository(prisma);
    const result = await repository.markCrawled(company.id, crawledAt);

    expect(result.lastCrawledAt).toEqual(crawledAt);
  });
});
