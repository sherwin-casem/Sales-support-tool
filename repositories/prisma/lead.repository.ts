import { SearchResultStage, type PrismaClient } from "@prisma/client";
import { resolveDbClient, type DbClient } from "@/lib/db/db-client.types.js";
import { getPrismaClient } from "@/lib/db/prisma.client.js";
import type { LeadRepository } from "@/repositories/interfaces/lead.repository.interface.js";
import { mapCompany, mapCompanyProfile } from "@/repositories/prisma/mappers.js";
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
