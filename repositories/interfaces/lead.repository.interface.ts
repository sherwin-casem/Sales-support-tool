import type { DbClient } from "@/lib/db/db-client.types.js";
import type {
  LeadScoreRecord,
  RankedLeadRecord,
  SaveLeadScoreInput,
  SaveLeadScoreResult,
} from "@/types/repositories/lead.repository.types.js";

export interface LeadRepository {
  saveScore(input: SaveLeadScoreInput, tx?: DbClient): Promise<SaveLeadScoreResult>;
  findBySearchResultId(
    searchResultId: string,
    tx?: DbClient,
  ): Promise<LeadScoreRecord | null>;
  findRankedBySearchJobId(
    searchJobId: string,
    options?: { limit?: number; minScore?: number; stage?: import("@prisma/client").SearchResultStage },
    tx?: DbClient,
  ): Promise<RankedLeadRecord[]>;
  findResultsWithDetailsForJob(
    searchJobId: string,
    options?: { minScore?: number; stage?: import("@prisma/client").SearchResultStage },
    tx?: DbClient,
  ): Promise<RankedLeadRecord[]>;
}
