import { SearchResultStage, type PrismaClient } from "@prisma/client";
import { resolveDbClient, type DbClient } from "@/lib/db/db-client.types.js";
import { getPrismaClient } from "@/lib/db/prisma.client.js";
import type { LeadRepository } from "@/repositories/interfaces/lead.repository.interface.js";
import { mapCompany, mapCompanyProfile } from "@/repositories/prisma/mappers.js";
import { findLatestProfilesByCompanyIds } from "@/repositories/prisma/repository.utils.js";
import type { RankedLeadRecord } from "@/types/repositories/lead.repository.types.js";

export class PrismaLeadRepository implements LeadRepository {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async findResultsWithDetailsForJob(
    searchJobId: string,
    options: { stage?: SearchResultStage } = {},
    tx?: DbClient,
  ): Promise<RankedLeadRecord[]> {
    const client = resolveDbClient(this.prisma, tx);

    const records = await client.searchResult.findMany({
      where: {
        searchJobId,
        stage: options.stage,
      },
      include: {
        company: true,
      },
      orderBy: [{ rank: "asc" }, { discoveredAt: "asc" }],
    });

    const companyIds = records.map((record) => record.companyId);
    const profiles = await findLatestProfilesByCompanyIds(client, companyIds);

    const latestProfileByCompany = new Map(
      profiles.map((profile) => [profile.companyId, mapCompanyProfile(profile)]),
    );

    return records.map((record) => ({
      searchResultId: record.id,
      searchJobId: record.searchJobId,
      companyId: record.companyId,
      rank: record.rank,
      stage: record.stage,
      stageError: record.stageError,
      discoveredAt: record.discoveredAt,
      completedAt: record.completedAt,
      company: mapCompany(record.company),
      profile: latestProfileByCompany.get(record.companyId) ?? null,
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
