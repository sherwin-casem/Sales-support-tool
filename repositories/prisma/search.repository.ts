import {
  Prisma,
  SearchJobStatus,
  SearchResultStage,
  type PrismaClient,
} from "@prisma/client";
import { resolveDbClient, type DbClient } from "@/lib/db/db-client.types.js";
import { getPrismaClient } from "@/lib/db/prisma.client.js";
import { ACTIVE_SEARCH_JOB_STATUSES } from "@/services/domain/search/search-job-status.js";
import type { CompanyRepository } from "@/repositories/interfaces/company.repository.interface.js";
import type { SearchRepository } from "@/repositories/interfaces/search.repository.interface.js";
import { PrismaCompanyRepository } from "@/repositories/prisma/company.repository.js";
import { mapSearchJob, mapSearchResult } from "@/repositories/prisma/mappers.js";
import { domainNormalizerService } from "@/services/domain/company/domain-normalizer.service.js";
import { RepositoryError } from "@/types/repositories/repository-error.types.js";
import type { ParsedQuery } from "@/types/agents/query-parser.types.js";
import type {
  AddDiscoveredCompaniesResult,
  CreateSearchJobInput,
  DiscoveredCompanyInput,
  FailStaleSearchJobsInput,
  SearchJobRecord,
  SearchResultRecord,
  UpdateSearchResultStageInput,
} from "@/types/repositories/search.repository.types.js";

export class PrismaSearchRepository implements SearchRepository {
  constructor(
    private readonly prisma: PrismaClient = getPrismaClient(),
    private readonly companyRepository: CompanyRepository = new PrismaCompanyRepository(),
  ) {}

  async createJob(
    input: CreateSearchJobInput,
    tx?: DbClient,
  ): Promise<SearchJobRecord> {
    const client = resolveDbClient(this.prisma, tx);
    const record = await client.searchJob.create({
      data: {
        userId: input.userId,
        query: input.query,
        criteria: (input.criteria ?? {}) as unknown as Prisma.InputJsonValue,
        companyLimit: input.companyLimit ?? null,
        status: SearchJobStatus.PENDING,
      },
    });

    return mapSearchJob(record);
  }

  async findJobById(id: string, tx?: DbClient): Promise<SearchJobRecord | null> {
    const client = resolveDbClient(this.prisma, tx);
    const record = await client.searchJob.findUnique({ where: { id } });

    return record ? mapSearchJob(record) : null;
  }

  async updateJobStatus(
    searchJobId: string,
    status: SearchJobStatus,
    options: {
      errorMessage?: string | null;
      startedAt?: Date | null;
      completedAt?: Date | null;
    } = {},
    tx?: DbClient,
  ): Promise<SearchJobRecord> {
    const client = resolveDbClient(this.prisma, tx);

    try {
      const record = await client.searchJob.update({
        where: { id: searchJobId },
        data: {
          status,
          errorMessage: options.errorMessage,
          startedAt: options.startedAt,
          completedAt: options.completedAt,
        },
      });

      return mapSearchJob(record);
    } catch (error) {
      throw new RepositoryError(
        "NOT_FOUND",
        `Search job not found: ${searchJobId}`,
        error,
      );
    }
  }

  async updateJobCriteria(
    searchJobId: string,
    criteria: ParsedQuery | Record<string, unknown>,
    tx?: DbClient,
  ): Promise<SearchJobRecord> {
    const client = resolveDbClient(this.prisma, tx);

    try {
      const record = await client.searchJob.update({
        where: { id: searchJobId },
        data: { criteria: criteria as unknown as Prisma.InputJsonValue },
      });

      return mapSearchJob(record);
    } catch (error) {
      throw new RepositoryError(
        "NOT_FOUND",
        `Search job not found: ${searchJobId}`,
        error,
      );
    }
  }

  async addDiscoveredCompanies(
    searchJobId: string,
    discoveries: DiscoveredCompanyInput[],
  ): Promise<AddDiscoveredCompaniesResult> {
    if (discoveries.length === 0) {
      return {
        companies: [],
        searchResults: [],
        skippedDuplicates: 0,
      };
    }

    return this.prisma.$transaction(async (tx) => {
      const job = await tx.searchJob.findUnique({
        where: { id: searchJobId },
        select: { id: true },
      });

      if (!job) {
        throw new RepositoryError("NOT_FOUND", `Search job not found: ${searchJobId}`);
      }

      const upsertResult = await this.companyRepository.upsertManyByDomain(
        discoveries.map((discovery) => ({
          website: discovery.website,
          name: discovery.companyName,
        })),
        tx,
      );

      const companyByDomain = new Map(
        upsertResult.companies.map((company) => [company.normalizedDomain, company]),
      );

      const existingResults = await tx.searchResult.findMany({
        where: { searchJobId },
        select: { companyId: true },
      });
      const seenCompanyIds = new Set(
        existingResults.map((result) => result.companyId),
      );

      let skippedDuplicates = 0;
      const rowsToCreate: Prisma.SearchResultCreateManyInput[] = [];

      for (const [index, discovery] of discoveries.entries()) {
        const normalized = domainNormalizerService.normalizeWebsite(discovery.website);

        if (!normalized) {
          continue;
        }

        const company = companyByDomain.get(normalized.domain);

        if (!company) {
          continue;
        }

        if (seenCompanyIds.has(company.id)) {
          skippedDuplicates += 1;
          continue;
        }

        seenCompanyIds.add(company.id);
        rowsToCreate.push({
          searchJobId,
          companyId: company.id,
          stage: SearchResultStage.DISCOVERED,
          rank: discovery.rank ?? index + 1,
          discoverySource: discovery.discoverySource ?? null,
          discoveryUrl: discovery.discoveryUrl ?? discovery.website,
        });
      }

      let searchResults: SearchResultRecord[] = [];

      if (rowsToCreate.length > 0) {
        try {
          await tx.searchResult.createMany({
            data: rowsToCreate,
            skipDuplicates: true,
          });
        } catch (error) {
          throw new RepositoryError(
            "DATABASE_ERROR",
            "Failed to create search results",
            error,
          );
        }

        const created = await tx.searchResult.findMany({
          where: {
            searchJobId,
            companyId: { in: rowsToCreate.map((row) => row.companyId) },
          },
          orderBy: [{ rank: "asc" }, { discoveredAt: "asc" }],
        });

        searchResults = created.map(mapSearchResult);
      }

      return {
        companies: upsertResult.companies,
        searchResults,
        skippedDuplicates,
      };
    });
  }

  async findResultsByJobId(
    searchJobId: string,
    options: { stage?: SearchResultStage } = {},
    tx?: DbClient,
  ): Promise<SearchResultRecord[]> {
    const client = resolveDbClient(this.prisma, tx);
    const records = await client.searchResult.findMany({
      where: {
        searchJobId,
        stage: options.stage,
      },
      orderBy: [{ rank: "asc" }, { discoveredAt: "asc" }],
    });

    return records.map(mapSearchResult);
  }

  async countResultsByStage(
    searchJobId: string,
    tx?: DbClient,
  ): Promise<Partial<Record<SearchResultStage, number>>> {
    const client = resolveDbClient(this.prisma, tx);
    const groups = await client.searchResult.groupBy({
      by: ["stage"],
      where: { searchJobId },
      _count: { _all: true },
    });

    const counts: Partial<Record<SearchResultStage, number>> = {};

    for (const group of groups) {
      counts[group.stage] = group._count._all;
    }

    return counts;
  }

  async updateResultStage(
    input: UpdateSearchResultStageInput,
    tx?: DbClient,
  ): Promise<SearchResultRecord> {
    const client = resolveDbClient(this.prisma, tx);

    try {
      const record = await client.searchResult.update({
        where: { id: input.searchResultId },
        data: {
          stage: input.stage,
          stageError: input.stageError ?? null,
          completedAt: input.completedAt,
        },
      });

      return mapSearchResult(record);
    } catch (error) {
      throw new RepositoryError(
        "NOT_FOUND",
        `Search result not found: ${input.searchResultId}`,
        error,
      );
    }
  }

  async findJobByIdForUser(
    id: string,
    userId: string,
    tx?: DbClient,
  ): Promise<SearchJobRecord | null> {
    const client = resolveDbClient(this.prisma, tx);
    const record = await client.searchJob.findFirst({
      where: { id, userId },
    });

    return record ? mapSearchJob(record) : null;
  }

  async countActiveJobsForUser(userId: string, tx?: DbClient): Promise<number> {
    const client = resolveDbClient(this.prisma, tx);

    return client.searchJob.count({
      where: {
        userId,
        status: {
          in: [...ACTIVE_SEARCH_JOB_STATUSES],
        },
      },
    });
  }

  async failStaleJobs(
    input: FailStaleSearchJobsInput,
    tx?: DbClient,
  ): Promise<SearchJobRecord[]> {
    const client = resolveDbClient(this.prisma, tx);
    const completedAt = new Date();
    const activePipelineStatuses = ACTIVE_SEARCH_JOB_STATUSES.filter(
      (status) => status !== "PENDING",
    );

    const staleJobs = await client.searchJob.findMany({
      where: {
        ...(input.userId ? { userId: input.userId } : {}),
        OR: [
          {
            status: SearchJobStatus.PENDING,
            createdAt: { lt: input.pendingStaleBefore },
          },
          {
            status: { in: activePipelineStatuses },
            updatedAt: { lt: input.activeStaleBefore },
          },
        ],
      },
      select: { id: true },
    });

    if (staleJobs.length === 0) {
      return [];
    }

    const staleJobIds = staleJobs.map((job) => job.id);

    await client.searchJob.updateMany({
      where: { id: { in: staleJobIds } },
      data: {
        status: SearchJobStatus.FAILED,
        errorMessage: input.errorMessage,
        completedAt,
      },
    });

    const records = await client.searchJob.findMany({
      where: { id: { in: staleJobIds } },
    });

    return records.map(mapSearchJob);
  }

  async deleteResult(searchResultId: string, tx?: DbClient): Promise<void> {
    const client = resolveDbClient(this.prisma, tx);

    try {
      await client.searchResult.delete({ where: { id: searchResultId } });
    } catch (error) {
      throw new RepositoryError(
        "NOT_FOUND",
        `Search result not found: ${searchResultId}`,
        error,
      );
    }
  }

  async findResultById(
    id: string,
    tx?: DbClient,
  ): Promise<SearchResultRecord | null> {
    const client = resolveDbClient(this.prisma, tx);
    const record = await client.searchResult.findUnique({ where: { id } });

    return record ? mapSearchResult(record) : null;
  }
}

let cachedRepository: PrismaSearchRepository | undefined;

export function getSearchRepository(): PrismaSearchRepository {
  if (!cachedRepository) {
    cachedRepository = new PrismaSearchRepository();
  }

  return cachedRepository;
}

export function resetSearchRepositoryCache(): void {
  cachedRepository = undefined;
}
