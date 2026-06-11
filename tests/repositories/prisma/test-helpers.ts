import { Prisma, type SearchJobStatus } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { vi } from "vitest";
import type { CompanyRepository } from "@/repositories/interfaces/company.repository.interface.js";
import type {
  CompanyRecord,
  UpsertCompaniesResult,
} from "@/types/repositories/company.repository.types.js";

type MockFn = ReturnType<typeof vi.fn>;

export type MockPrismaClient = PrismaClient & {
  company: {
    findUnique: MockFn;
    upsert: MockFn;
    update: MockFn;
  };
  companyProfile: {
    findFirst: MockFn;
    findUnique: MockFn;
    create: MockFn;
    findMany: MockFn;
  };
  searchJob: {
    create: MockFn;
    findUnique: MockFn;
    findMany: MockFn;
    findFirst: MockFn;
    update: MockFn;
    updateMany: MockFn;
    count: MockFn;
  };
  searchResult: {
    create: MockFn;
    findMany: MockFn;
    findUnique: MockFn;
    update: MockFn;
    delete: MockFn;
  };
  $transaction: MockFn;
};

export function createMockCompany(overrides: Partial<{
  id: string;
  domain: string;
  normalizedDomain: string;
  name: string | null;
  websiteUrl: string | null;
}> = {}) {
  const now = new Date("2026-06-07T12:00:00.000Z");

  return {
    id: overrides.id ?? "00000000-0000-4000-8000-000000000010",
    domain: overrides.domain ?? "acme.fi",
    normalizedDomain: overrides.normalizedDomain ?? "acme.fi",
    name: overrides.name ?? "Acme Logistics Oy",
    websiteUrl: overrides.websiteUrl ?? "https://acme.fi",
    firstSeenAt: now,
    lastCrawledAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function createMockCompanyProfile(overrides: Partial<{
  id: string;
  companyId: string;
  version: number;
  contentHash: string | null;
}> = {}) {
  const now = new Date("2026-06-07T12:00:00.000Z");

  return {
    id: overrides.id ?? "00000000-0000-4000-8000-000000000020",
    companyId: overrides.companyId ?? "00000000-0000-4000-8000-000000000010",
    version: overrides.version ?? 1,
    structuredData: {
      companyName: "Acme Logistics Oy",
      description: "Freight and warehousing provider.",
      industry: "logistics",
      products: [],
      services: ["Freight forwarding"],
      targetCustomers: [],
      estimatedCompanySize: "100-200",
    },
    completeness: new Prisma.Decimal("0.900"),
    modelUsed: "gpt-4o",
    promptVersion: "v1",
    contentHash: overrides.contentHash ?? "abc123",
    extractedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

export function createMockSearchJob(
  overrides: Partial<{
    id: string;
    userId: string;
    query: string;
    status: SearchJobStatus;
    criteria: Record<string, unknown>;
    companyLimit: number | null;
    errorMessage: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }> = {},
) {
  const now = new Date("2026-06-07T12:00:00.000Z");

  return {
    id: overrides.id ?? "00000000-0000-4000-8000-000000000030",
    userId: overrides.userId ?? "00000000-0000-4000-8000-000000000001",
    query: overrides.query ?? "Find logistics companies in Finland",
    criteria: overrides.criteria ?? {
      industry: "logistics",
      location: "Finland",
      employeeRange: "50-200",
    },
    status: overrides.status ?? "PENDING",
    companyLimit: overrides.companyLimit ?? null,
    errorMessage: overrides.errorMessage ?? null,
    startedAt: overrides.startedAt ?? null,
    completedAt: overrides.completedAt ?? null,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
}

export function toCompanyRecord(
  company: ReturnType<typeof createMockCompany>,
): CompanyRecord {
  return {
    id: company.id,
    domain: company.domain,
    normalizedDomain: company.normalizedDomain,
    name: company.name,
    websiteUrl: company.websiteUrl,
    firstSeenAt: company.firstSeenAt,
    lastCrawledAt: company.lastCrawledAt,
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
  };
}

export function createMockCompanyRepository(
  upsertResult: UpsertCompaniesResult,
): CompanyRepository {
  return {
    upsertManyByDomain: vi.fn().mockResolvedValue(upsertResult),
  } as unknown as CompanyRepository;
}

export function createMockSearchResult(overrides: Partial<{
  id: string;
  searchJobId: string;
  companyId: string;
}> = {}) {
  const now = new Date("2026-06-07T12:00:00.000Z");

  return {
    id: overrides.id ?? "00000000-0000-4000-8000-000000000040",
    searchJobId: overrides.searchJobId ?? "00000000-0000-4000-8000-000000000030",
    companyId: overrides.companyId ?? "00000000-0000-4000-8000-000000000010",
    stage: "DISCOVERED",
    rank: 1,
    discoverySource: "discovery_agent",
    discoveryUrl: "https://acme.fi",
    stageError: null,
    discoveredAt: now,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function createMockPrismaClient() {
  const client = {
    company: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    companyProfile: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    searchJob: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    searchResult: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback(client),
    ),
  };

  return client as unknown as MockPrismaClient;
}

export function createUniqueConstraintError(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "6.9.0",
  });
}
