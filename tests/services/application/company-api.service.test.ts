import { describe, expect, it, vi } from "vitest";
import { CompanyApiService } from "@/services/application/company-api.service.js";
import type { CompanyApiServiceDependencies } from "@/services/application/company-api.service.js";

const userId = "00000000-0000-4000-8000-000000000001";
const companyId = "00000000-0000-4000-8000-000000000010";

function createDependencies(
  overrides: Partial<CompanyApiServiceDependencies> = {},
): CompanyApiServiceDependencies {
  return {
    companyRepository: {
      listForUser: vi.fn().mockResolvedValue({ items: [], totalItems: 0 }),
      findDetailForUser: vi.fn().mockResolvedValue(null),
    } as unknown as CompanyApiServiceDependencies["companyRepository"],
    ...overrides,
  };
}

describe("CompanyApiService", () => {
  it("returns paginated company list", async () => {
    const deps = createDependencies({
      companyRepository: {
        listForUser: vi.fn().mockResolvedValue({
          totalItems: 1,
          items: [
            {
              id: companyId,
              domain: "acme.fi",
              normalizedDomain: "acme.fi",
              name: "Acme Logistics Oy",
              websiteUrl: "https://acme.fi",
              firstSeenAt: new Date("2026-06-07T12:00:00.000Z"),
              lastCrawledAt: null,
              createdAt: new Date("2026-06-07T12:00:00.000Z"),
              updatedAt: new Date("2026-06-07T12:00:00.000Z"),
              latestProfile: {
                industry: "logistics",
                estimatedCompanySize: "100-200",
                completeness: 0.9,
                extractedAt: new Date("2026-06-07T12:01:00.000Z"),
              },
            },
          ],
        }),
        findDetailForUser: vi.fn(),
      } as unknown as CompanyApiServiceDependencies["companyRepository"],
    });
    const service = new CompanyApiService(deps);

    const result = await service.listCompanies(userId, {
      page: 1,
      pageSize: 25,
      sort: "updatedAt",
      order: "desc",
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.domain).toBe("acme.fi");
    expect(result.pagination.totalItems).toBe(1);
  });

  it("throws not found when company is inaccessible", async () => {
    const deps = createDependencies();
    const service = new CompanyApiService(deps);

    await expect(service.getCompany(userId, companyId)).rejects.toMatchObject({
      status: 404,
      code: "NOT_FOUND",
    });
  });

  it("returns company detail for accessible companies", async () => {
    const deps = createDependencies({
      companyRepository: {
        listForUser: vi.fn(),
        findDetailForUser: vi.fn().mockResolvedValue({
          id: companyId,
          domain: "acme.fi",
          normalizedDomain: "acme.fi",
          name: "Acme Logistics Oy",
          websiteUrl: "https://acme.fi",
          firstSeenAt: new Date("2026-06-07T12:00:00.000Z"),
          lastCrawledAt: null,
          createdAt: new Date("2026-06-07T12:00:00.000Z"),
          updatedAt: new Date("2026-06-07T12:00:00.000Z"),
          profile: null,
          profileHistory: [],
          recentSearches: [],
        }),
      } as unknown as CompanyApiServiceDependencies["companyRepository"],
    });
    const service = new CompanyApiService(deps);

    const result = await service.getCompany(userId, companyId);

    expect(result.id).toBe(companyId);
    expect(result.recentSearches).toEqual([]);
  });
});
