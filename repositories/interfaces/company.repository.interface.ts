import type { DbClient } from "@/lib/db/db-client.types.js";
import type {
  CompanyDetailRecord,
  CompanyProfileRecord,
  CompanyRecord,
  ListCompaniesForUserOptions,
  ListCompaniesForUserResult,
  SaveCompanyProfileInput,
  SaveCompanyProfileResult,
  SearchResultCompanyMatch,
  UpsertCompaniesResult,
  UpsertCompanyInput,
} from "@/types/repositories/company.repository.types.js";

export interface CompanyRepository {
  findById(id: string, tx?: DbClient): Promise<CompanyRecord | null>;
  findByNormalizedDomain(
    normalizedDomain: string,
    tx?: DbClient,
  ): Promise<CompanyRecord | null>;
  upsertByDomain(
    input: UpsertCompanyInput,
    tx?: DbClient,
  ): Promise<{ company: CompanyRecord; created: boolean }>;
  upsertManyByDomain(
    inputs: UpsertCompanyInput[],
    tx?: DbClient,
  ): Promise<UpsertCompaniesResult>;
  saveProfile(
    input: SaveCompanyProfileInput,
    tx?: DbClient,
  ): Promise<SaveCompanyProfileResult>;
  findLatestProfile(
    companyId: string,
    tx?: DbClient,
  ): Promise<CompanyProfileRecord | null>;
  markCrawled(companyId: string, crawledAt?: Date, tx?: DbClient): Promise<CompanyRecord>;
  listForUser(options: ListCompaniesForUserOptions): Promise<ListCompaniesForUserResult>;
  findDetailForUser(
    userId: string,
    companyId: string,
  ): Promise<CompanyDetailRecord | null>;
  findBySearchResultForUser(
    userId: string,
    searchResultId: string,
  ): Promise<SearchResultCompanyMatch | null>;
  deleteCompanyAndSearchResults(
    companyId: string,
    tx?: DbClient,
  ): Promise<{ deletedSearchResults: number }>;
}
