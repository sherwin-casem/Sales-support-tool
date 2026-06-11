import type { SearchJobStatus, SearchResultStage } from "@prisma/client";
import type { DbClient } from "@/lib/db/db-client.types.js";
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

export interface SearchRepository {
  createJob(input: CreateSearchJobInput, tx?: DbClient): Promise<SearchJobRecord>;
  findJobById(id: string, tx?: DbClient): Promise<SearchJobRecord | null>;
  updateJobStatus(
    searchJobId: string,
    status: SearchJobStatus,
    options?: {
      errorMessage?: string | null;
      startedAt?: Date | null;
      completedAt?: Date | null;
    },
    tx?: DbClient,
  ): Promise<SearchJobRecord>;
  updateJobCriteria(
    searchJobId: string,
    criteria: ParsedQuery | Record<string, unknown>,
    tx?: DbClient,
  ): Promise<SearchJobRecord>;
  addDiscoveredCompanies(
    searchJobId: string,
    discoveries: DiscoveredCompanyInput[],
  ): Promise<AddDiscoveredCompaniesResult>;
  findResultsByJobId(
    searchJobId: string,
    options?: { stage?: SearchResultStage },
    tx?: DbClient,
  ): Promise<SearchResultRecord[]>;
  updateResultStage(
    input: UpdateSearchResultStageInput,
    tx?: DbClient,
  ): Promise<SearchResultRecord>;
  deleteResult(searchResultId: string, tx?: DbClient): Promise<void>;
  findResultById(id: string, tx?: DbClient): Promise<SearchResultRecord | null>;
  findJobByIdForUser(
    id: string,
    userId: string,
    tx?: DbClient,
  ): Promise<SearchJobRecord | null>;
  countActiveJobsForUser(userId: string, tx?: DbClient): Promise<number>;
  failStaleJobs(
    input: FailStaleSearchJobsInput,
    tx?: DbClient,
  ): Promise<SearchJobRecord[]>;
}
