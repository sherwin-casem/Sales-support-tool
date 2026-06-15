import type { PrismaClient } from "@prisma/client";
import { resolveDbClient, type DbClient } from "@/lib/db/db-client.types.js";
import { getPrismaClient } from "@/lib/db/prisma.client.js";
import { computeSavedSearchOutreachStatus } from "@/lib/saved-search/outreach-status.js";
import type { SavedSearchRepository } from "@/repositories/interfaces/saved-search.repository.interface.js";
import type {
  CreateSavedSearchInput,
  SavedSearchDetailRecord,
  SavedSearchRecord,
} from "@/types/repositories/saved-search.repository.types.js";

function mapSavedSearch(record: {
  id: string;
  userId: string;
  searchJobId: string;
  savedAt: Date;
}): SavedSearchRecord {
  return {
    id: record.id,
    userId: record.userId,
    searchJobId: record.searchJobId,
    savedAt: record.savedAt,
  };
}

export class PrismaSavedSearchRepository implements SavedSearchRepository {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async findByIdForUser(
    userId: string,
    savedSearchId: string,
    tx?: DbClient,
  ): Promise<SavedSearchRecord | null> {
    const client = resolveDbClient(this.prisma, tx);
    const record = await client.savedSearch.findFirst({
      where: { id: savedSearchId, userId },
    });

    return record ? mapSavedSearch(record) : null;
  }

  async findBySearchJobIdForUser(
    userId: string,
    searchJobId: string,
    tx?: DbClient,
  ): Promise<SavedSearchRecord | null> {
    const client = resolveDbClient(this.prisma, tx);
    const record = await client.savedSearch.findFirst({
      where: { userId, searchJobId },
    });

    return record ? mapSavedSearch(record) : null;
  }

  async listForUser(userId: string, tx?: DbClient): Promise<SavedSearchDetailRecord[]> {
    const client = resolveDbClient(this.prisma, tx);

    const records = await client.savedSearch.findMany({
      where: { userId },
      include: {
        searchJob: true,
      },
      orderBy: { savedAt: "desc" },
    });

    const details: SavedSearchDetailRecord[] = [];

    for (const record of records) {
      const leadCount = await client.searchResult.count({
        where: { searchJobId: record.searchJobId },
      });

      const searchResultIds = await client.searchResult.findMany({
        where: { searchJobId: record.searchJobId },
        select: { id: true },
      });

      const resultIds = searchResultIds.map((item) => item.id);
      let outreachStatus = computeSavedSearchOutreachStatus([]);

      if (resultIds.length > 0) {
        const recipients = await client.campaignRecipient.findMany({
          where: {
            searchResultId: { in: resultIds },
          },
          select: {
            status: true,
            campaign: {
              select: {
                status: true,
              },
            },
          },
        });

        outreachStatus = computeSavedSearchOutreachStatus(
          recipients.map((recipient) => ({
            status: recipient.status,
            campaignStatus: recipient.campaign.status,
          })),
        );
      }

      details.push({
        id: record.id,
        userId: record.userId,
        searchJobId: record.searchJobId,
        savedAt: record.savedAt,
        query: record.searchJob.query,
        searchJobStatus: record.searchJob.status,
        leadCount,
        outreachStatus,
      });
    }

    return details;
  }

  async upsert(input: CreateSavedSearchInput, tx?: DbClient): Promise<SavedSearchRecord> {
    const client = resolveDbClient(this.prisma, tx);

    const record = await client.savedSearch.upsert({
      where: {
        userId_searchJobId: {
          userId: input.userId,
          searchJobId: input.searchJobId,
        },
      },
      create: {
        userId: input.userId,
        searchJobId: input.searchJobId,
      },
      update: {},
    });

    return mapSavedSearch(record);
  }

  async deleteByIdForUser(
    userId: string,
    savedSearchId: string,
    tx?: DbClient,
  ): Promise<boolean> {
    const client = resolveDbClient(this.prisma, tx);

    const result = await client.savedSearch.deleteMany({
      where: { id: savedSearchId, userId },
    });

    return result.count > 0;
  }
}

let cachedRepository: PrismaSavedSearchRepository | undefined;

export function getSavedSearchRepository(): PrismaSavedSearchRepository {
  if (!cachedRepository) {
    cachedRepository = new PrismaSavedSearchRepository();
  }

  return cachedRepository;
}

export function resetSavedSearchRepositoryCache(): void {
  cachedRepository = undefined;
}
