import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { resolveDbClient, type DbClient } from "@/lib/db/db-client.types.js";
import { isUniqueConstraintError } from "@/lib/db/prisma-errors.js";
import { getPrismaClient } from "@/lib/db/prisma.client.js";
import type { CompanyRepository } from "@/repositories/interfaces/company.repository.interface.js";
import {
  mapCompany,
  mapCompanyProfile,
  toDecimal,
} from "@/repositories/prisma/mappers.js";
import {
  assertValidProfileInput,
  dedupeCompanyUpsertInputs,
  findExistingProfileByContentHash,
  getNextProfileVersion,
  normalizeCompanyUpsertInput,
} from "@/repositories/prisma/repository.utils.js";
import { RepositoryError } from "@/types/repositories/repository-error.types.js";
import type {
  CompanyDetailRecord,
  CompanyProfileRecord,
  CompanyRecord,
  ListCompaniesForUserOptions,
  ListCompaniesForUserResult,
  SaveCompanyProfileInput,
  SaveCompanyProfileResult,
  UpsertCompaniesResult,
  UpsertCompanyInput,
} from "@/types/repositories/company.repository.types.js";

export class PrismaCompanyRepository implements CompanyRepository {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async findById(id: string, tx?: DbClient): Promise<CompanyRecord | null> {
    const client = resolveDbClient(this.prisma, tx);
    const record = await client.company.findUnique({ where: { id } });

    return record ? mapCompany(record) : null;
  }

  async findByNormalizedDomain(
    normalizedDomain: string,
    tx?: DbClient,
  ): Promise<CompanyRecord | null> {
    const client = resolveDbClient(this.prisma, tx);
    const record = await client.company.findUnique({
      where: { normalizedDomain: normalizedDomain.toLowerCase() },
    });

    return record ? mapCompany(record) : null;
  }

  async upsertByDomain(
    input: UpsertCompanyInput,
    tx?: DbClient,
  ): Promise<{ company: CompanyRecord; created: boolean }> {
    const client = resolveDbClient(this.prisma, tx);
    const normalized = normalizeCompanyUpsertInput(input);

    const existing = await client.company.findUnique({
      where: { normalizedDomain: normalized.normalizedDomain },
    });

    const record = await client.company.upsert({
      where: { normalizedDomain: normalized.normalizedDomain },
      create: {
        domain: normalized.domain,
        normalizedDomain: normalized.normalizedDomain,
        name: normalized.name,
        websiteUrl: normalized.websiteUrl,
      },
      update: {
        name: normalized.name ?? undefined,
        websiteUrl: normalized.websiteUrl,
      },
    });

    return {
      company: mapCompany(record),
      created: !existing,
    };
  }

  async upsertManyByDomain(
    inputs: UpsertCompanyInput[],
    tx?: DbClient,
  ): Promise<UpsertCompaniesResult> {
    const deduped = dedupeCompanyUpsertInputs(inputs);

    const execute = async (client: DbClient): Promise<UpsertCompaniesResult> => {
      const companies: CompanyRecord[] = [];
      let createdCount = 0;
      let updatedCount = 0;

      for (const normalized of deduped) {
        const result = await this.upsertByDomain(
          {
            website: normalized.websiteUrl,
            name: normalized.name,
          },
          client,
        );

        companies.push(result.company);

        if (result.created) {
          createdCount += 1;
        } else {
          updatedCount += 1;
        }
      }

      return {
        companies,
        createdCount,
        updatedCount,
      };
    };

    if (tx) {
      return execute(tx);
    }

    return this.prisma.$transaction(async (transaction) => execute(transaction));
  }

  async saveProfile(
    input: SaveCompanyProfileInput,
    tx?: DbClient,
  ): Promise<SaveCompanyProfileResult> {
    assertValidProfileInput(input);

    const client = resolveDbClient(this.prisma, tx);

    const existingByHash = await findExistingProfileByContentHash(
      client,
      input.companyId,
      input.contentHash,
    );

    if (existingByHash) {
      return {
        profile: mapCompanyProfile(existingByHash),
        created: false,
      };
    }

    const version = await getNextProfileVersion(client, input.companyId);

    try {
      const record = await client.companyProfile.create({
        data: {
          companyId: input.companyId,
          version,
          structuredData: input.structuredData as unknown as Prisma.InputJsonValue,
          completeness:
            input.completeness !== undefined
              ? toDecimal(input.completeness)
              : null,
          modelUsed: input.modelUsed ?? null,
          promptVersion: input.promptVersion ?? null,
          contentHash: input.contentHash ?? null,
          extractedAt: input.extractedAt ?? new Date(),
        },
      });

      return {
        profile: mapCompanyProfile(record),
        created: true,
      };
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const existing = await client.companyProfile.findUnique({
          where: {
            companyId_version: {
              companyId: input.companyId,
              version,
            },
          },
        });

        if (existing) {
          return {
            profile: mapCompanyProfile(existing),
            created: false,
          };
        }
      }

      throw new RepositoryError(
        "DATABASE_ERROR",
        "Failed to save company profile",
        error,
      );
    }
  }

  async findLatestProfile(
    companyId: string,
    tx?: DbClient,
  ): Promise<CompanyProfileRecord | null> {
    const client = resolveDbClient(this.prisma, tx);
    const record = await client.companyProfile.findFirst({
      where: { companyId },
      orderBy: { version: "desc" },
    });

    return record ? mapCompanyProfile(record) : null;
  }

  async markCrawled(
    companyId: string,
    crawledAt = new Date(),
    tx?: DbClient,
  ): Promise<CompanyRecord> {
    const client = resolveDbClient(this.prisma, tx);

    try {
      const record = await client.company.update({
        where: { id: companyId },
        data: { lastCrawledAt: crawledAt },
      });

      return mapCompany(record);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new RepositoryError("NOT_FOUND", `Company not found: ${companyId}`, error);
      }

      throw new RepositoryError("DATABASE_ERROR", "Failed to update company crawl time", error);
    }
  }

  async listForUser(
    options: ListCompaniesForUserOptions,
  ): Promise<ListCompaniesForUserResult> {
    const client = resolveDbClient(this.prisma);
    const skip = (options.page - 1) * options.pageSize;

    const accessibleCompanies = await client.searchResult.findMany({
      where: { searchJob: { userId: options.userId } },
      select: { companyId: true },
      distinct: ["companyId"],
    });

    const companyIds = accessibleCompanies.map((entry) => entry.companyId);

    if (companyIds.length === 0) {
      return { items: [], totalItems: 0 };
    }

    const where: Prisma.CompanyWhereInput = {
      id: { in: companyIds },
      ...(options.domain
        ? {
            OR: [
              { domain: { contains: options.domain, mode: "insensitive" } },
              { normalizedDomain: { contains: options.domain.toLowerCase() } },
            ],
          }
        : {}),
      ...(options.industry
        ? {
            profiles: {
              some: {
                structuredData: {
                  path: ["industry"],
                  string_contains: options.industry,
                },
              },
            },
          }
        : {}),
    };

    const orderBy = buildCompanyOrderBy(options.sort, options.order);

    const [totalItems, companies] = await Promise.all([
      client.company.count({ where }),
      client.company.findMany({
        where,
        orderBy,
        skip,
        take: options.pageSize,
      }),
    ]);

    const pageCompanyIds = companies.map((company) => company.id);
    const profiles = pageCompanyIds.length
      ? await client.companyProfile.findMany({
          where: { companyId: { in: pageCompanyIds } },
          orderBy: [{ companyId: "asc" }, { version: "desc" }],
        })
      : [];

    const latestProfileByCompany = new Map<string, CompanyProfileRecord>();

    for (const profile of profiles) {
      if (!latestProfileByCompany.has(profile.companyId)) {
        latestProfileByCompany.set(profile.companyId, mapCompanyProfile(profile));
      }
    }

    return {
      totalItems,
      items: companies.map((company) => {
        const mappedCompany = mapCompany(company);
        const latestProfile = latestProfileByCompany.get(company.id);

        return {
          ...mappedCompany,
          latestProfile: latestProfile
            ? {
                industry: latestProfile.structuredData.industry ?? null,
                estimatedCompanySize:
                  latestProfile.structuredData.estimatedCompanySize ?? null,
                completeness: latestProfile.completeness,
                extractedAt: latestProfile.extractedAt,
              }
            : null,
        };
      }),
    };
  }

  async findDetailForUser(
    userId: string,
    companyId: string,
  ): Promise<CompanyDetailRecord | null> {
    const client = resolveDbClient(this.prisma);

    const access = await client.searchResult.findFirst({
      where: {
        companyId,
        searchJob: { userId },
      },
    });

    if (!access) {
      return null;
    }

    const company = await client.company.findUnique({ where: { id: companyId } });

    if (!company) {
      return null;
    }

    const profiles = await client.companyProfile.findMany({
      where: { companyId },
      orderBy: { version: "desc" },
    });

    const recentSearches = await client.searchResult.findMany({
      where: {
        companyId,
        searchJob: { userId },
      },
      include: {
        searchJob: true,
      },
      orderBy: { discoveredAt: "desc" },
      take: 10,
    });

    const mappedProfiles = profiles.map(mapCompanyProfile);

    return {
      ...mapCompany(company),
      profile: mappedProfiles[0] ?? null,
      profileHistory: mappedProfiles.map((profile) => ({
        version: profile.version,
        completeness: profile.completeness,
        extractedAt: profile.extractedAt,
        contentHash: profile.contentHash,
      })),
      recentSearches: recentSearches.map((result) => ({
        searchJobId: result.searchJobId,
        searchResultId: result.id,
        query: result.searchJob.query,
        stage: result.stage,
        rank: result.rank,
        searchedAt: result.discoveredAt,
      })),
    };
  }
}

function buildCompanyOrderBy(
  sort: ListCompaniesForUserOptions["sort"],
  order: ListCompaniesForUserOptions["order"],
): Prisma.CompanyOrderByWithRelationInput {
  switch (sort) {
    case "name":
      return { name: order };
    case "domain":
      return { domain: order };
    case "lastCrawledAt":
      return { lastCrawledAt: order };
    case "updatedAt":
    default:
      return { updatedAt: order };
  }
}

let cachedRepository: PrismaCompanyRepository | undefined;

export function getCompanyRepository(): PrismaCompanyRepository {
  if (!cachedRepository) {
    cachedRepository = new PrismaCompanyRepository();
  }

  return cachedRepository;
}

export function resetCompanyRepositoryCache(): void {
  cachedRepository = undefined;
}
