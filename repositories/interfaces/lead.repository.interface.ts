import type { DbClient } from "@/lib/db/db-client.types.js";
import type { RankedLeadRecord } from "@/types/repositories/lead.repository.types.js";

export interface LeadRepository {
  findResultsWithDetailsForJob(
    searchJobId: string,
    options?: { stage?: import("@prisma/client").SearchResultStage },
    tx?: DbClient,
  ): Promise<RankedLeadRecord[]>;
}
