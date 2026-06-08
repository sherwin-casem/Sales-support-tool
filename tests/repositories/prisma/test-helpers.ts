import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { vi } from "vitest";

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

export function createMockSearchJob(overrides: Partial<{ id: string }> = {}) {
  const now = new Date("2026-06-07T12:00:00.000Z");

  return {
    id: overrides.id ?? "00000000-0000-4000-8000-000000000030",
    userId: "00000000-0000-4000-8000-000000000001",
    query: "Find logistics companies in Finland",
    criteria: {
      industry: "logistics",
      location: "Finland",
      employeeRange: "50-200",
    },
    status: "PENDING",
    companyLimit: 25,
    errorMessage: null,
    startedAt: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };
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
    discoverySource: "wikidata",
    discoveryUrl: "https://acme.fi",
    stageError: null,
    discoveredAt: now,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function createMockLeadScore(overrides: Partial<{
  id: string;
  searchResultId: string;
  searchJobId: string;
}> = {}) {
  const now = new Date("2026-06-07T12:00:00.000Z");

  return {
    id: overrides.id ?? "00000000-0000-4000-8000-000000000050",
    searchResultId:
      overrides.searchResultId ?? "00000000-0000-4000-8000-000000000040",
    searchJobId: overrides.searchJobId ?? "00000000-0000-4000-8000-000000000030",
    totalScore: new Prisma.Decimal("88.15"),
    confidence: new Prisma.Decimal("0.910"),
    breakdown: {
      industryFit: {
        score: 100,
        weight: 0.3,
        weightedScore: 30,
        confidence: 0.95,
        rationale: "Exact industry match.",
        signals: [],
      },
      sizeFit: {
        score: 95,
        weight: 0.25,
        weightedScore: 23.75,
        confidence: 0.9,
        rationale: "Strong overlap.",
        signals: [],
      },
      businessMaturity: {
        score: 80,
        weight: 0.25,
        weightedScore: 20,
        confidence: 0.8,
        rationale: "Mature profile.",
        signals: [],
      },
      growthIndicators: {
        score: 60,
        weight: 0.2,
        weightedScore: 12,
        confidence: 0.7,
        rationale: "Moderate growth.",
        signals: [],
      },
    },
    rationale: "Strong logistics fit.",
    modelUsed: "gpt-4o",
    promptVersion: "v1",
    scoredAt: now,
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
      update: vi.fn(),
    },
    searchResult: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    leadScore: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback(client),
    ),
  };

  return client as unknown as PrismaClient & {
    company: {
      findUnique: ReturnType<typeof vi.fn>;
      upsert: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    companyProfile: {
      findFirst: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
    searchJob: {
      create: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    searchResult: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    leadScore: {
      findUnique: ReturnType<typeof vi.fn>;
      upsert: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
}

export function createUniqueConstraintError(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "6.9.0",
  });
}
