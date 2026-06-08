import { Prisma, SearchResultStage, type PrismaClient } from "@prisma/client";
import { resolveDbClient, type DbClient } from "@/lib/db/db-client.types.js";
import { getPrismaClient } from "@/lib/db/prisma.client.js";
import type { LeadRepository } from "@/repositories/interfaces/lead.repository.interface.js";
import {
  mapCompany,
  mapCompanyProfile,
  mapLeadScore,
  toDecimal,
  toScoreDecimal,
} from "@/repositories/prisma/mappers.js";
import type {
  LeadScoreRecord,
  RankedLeadRecord,
  SaveLeadScoreInput,
  SaveLeadScoreResult,
} from "@/types/repositories/lead.repository.types.js";

export class PrismaLeadRepository implements LeadRepository {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async saveScore(
    input: SaveLeadScoreInput,
    tx?: DbClient,
  ): Promise<SaveLeadScoreResult> {
    const execute = async (client: DbClient): Promise<SaveLeadScoreResult> => {
      const existing = await client.leadScore.findUnique({
        where: { searchResultId: input.searchResultId },
      });

      const record = await client.leadScore.upsert({
        where: { searchResultId: input.searchResultId },
        create: {
          searchResultId: input.searchResultId,
          searchJobId: input.searchJobId,
          totalScore: toScoreDecimal(input.totalScore),
          confidence: toDecimal(input.confidence),
          breakdown: input.breakdown as unknown as Prisma.InputJsonValue,
          rationale: input.rationale,
          modelUsed: input.modelUsed ?? null,
          promptVersion: input.promptVersion ?? null,
          scoredAt: input.scoredAt ?? new Date(),
        },
        update: {
          totalScore: toScoreDecimal(input.totalScore),
          confidence: toDecimal(input.confidence),
          breakdown: input.breakdown as unknown as Prisma.InputJsonValue,
          rationale: input.rationale,
          modelUsed: input.modelUsed ?? null,
          promptVersion: input.promptVersion ?? null,
          scoredAt: input.scoredAt ?? new Date(),
        },
      });

      await client.searchResult.update({
        where: { id: input.searchResultId },
        data: {
          stage: SearchResultStage.SCORED,
          stageError: null,
          completedAt: input.scoredAt ?? new Date(),
        },
      });

      return {
        leadScore: mapLeadScore(record),
        created: !existing,
      };
    };

    if (tx) {
      return execute(tx);
    }

    return this.prisma.$transaction(async (transaction) => execute(transaction));
  }

  async findBySearchResultId(
    searchResultId: string,
    tx?: DbClient,
  ): Promise<LeadScoreRecord | null> {
    const client = resolveDbClient(this.prisma, tx);
    const record = await client.leadScore.findUnique({
      where: { searchResultId },
    });

    return record ? mapLeadScore(record) : null;
  }

  async findRankedBySearchJobId(
    searchJobId: string,
    options: {
      limit?: number;
      minScore?: number;
      stage?: SearchResultStage;
    } = {},
    tx?: DbClient,
  ): Promise<RankedLeadRecord[]> {
    return this.findResultsWithDetailsForJob(searchJobId, options, tx, {
      scoredOnly: true,
      limit: options.limit,
    });
  }

  async findResultsWithDetailsForJob(
    searchJobId: string,
    options: { minScore?: number; stage?: SearchResultStage } = {},
    tx?: DbClient,
    queryOptions: { scoredOnly?: boolean; limit?: number } = {},
  ): Promise<RankedLeadRecord[]> {
    const client = resolveDbClient(this.prisma, tx);

    const records = await client.searchResult.findMany({
      where: {
        searchJobId,
        stage: options.stage,
        ...(queryOptions.scoredOnly
          ? {
              leadScore: options.minScore
                ? { totalScore: { gte: toScoreDecimal(options.minScore) } }
                : { isNot: null },
            }
          : options.minScore
            ? { leadScore: { totalScore: { gte: toScoreDecimal(options.minScore) } } }
            : {}),
      },
      include: {
        company: true,
        leadScore: true,
      },
      orderBy: [{ rank: "asc" }, { discoveredAt: "asc" }],
      take: queryOptions.limit,
    });

    const companyIds = records.map((record) => record.companyId);
    const profiles = companyIds.length
      ? await client.companyProfile.findMany({
          where: { companyId: { in: companyIds } },
          orderBy: [{ companyId: "asc" }, { version: "desc" }],
        })
      : [];

    const latestProfileByCompany = new Map<string, ReturnType<typeof mapCompanyProfile>>();

    for (const profile of profiles) {
      if (!latestProfileByCompany.has(profile.companyId)) {
        latestProfileByCompany.set(profile.companyId, mapCompanyProfile(profile));
      }
    }

    return records.map((record) => ({
      searchResultId: record.id,
      searchJobId: record.searchJobId,
      rank: record.rank,
      stage: record.stage,
      company: mapCompany(record.company),
      profile: latestProfileByCompany.get(record.companyId) ?? null,
      leadScore: record.leadScore ? mapLeadScore(record.leadScore) : null,
    }));
  }
}

let cachedRepository: PrismaLeadRepository | undefined;

export function getLeadRepository(): PrismaLeadRepository {
  if (!cachedRepository) {
    cachedRepository = new PrismaLeadRepository();
  }

  return cachedRepository;
}

export function resetLeadRepositoryCache(): void {
  cachedRepository = undefined;
}
