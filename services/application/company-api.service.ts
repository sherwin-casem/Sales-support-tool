import { ApiError } from "@/lib/api/api-error.js";
import { mapCompanyListItem, mapGetCompanyResponse } from "@/lib/api/api-mappers.js";
import { buildPaginationMeta } from "@/lib/api/request-utils.js";
import type { ListCompaniesQueryInput } from "@/lib/validations/api/company.schema.js";
import type { CompanyRepository } from "@/repositories/interfaces/company.repository.interface.js";
import type {
  GetCompanyResponse,
  ListCompaniesResponse,
} from "@/types/api/company.api.types.js";

export interface CompanyApiServiceDependencies {
  companyRepository: CompanyRepository;
}

export class CompanyApiService {
  constructor(private readonly deps: CompanyApiServiceDependencies) {}

  async listCompanies(
    userId: string,
    query: ListCompaniesQueryInput,
  ): Promise<ListCompaniesResponse> {
    const result = await this.deps.companyRepository.listForUser({
      userId,
      page: query.page,
      pageSize: query.pageSize,
      industry: query.industry,
      domain: query.domain,
      sort: query.sort,
      order: query.order,
    });

    return {
      data: result.items.map(mapCompanyListItem),
      pagination: buildPaginationMeta(query.page, query.pageSize, result.totalItems),
    };
  }

  async getCompany(userId: string, companyId: string): Promise<GetCompanyResponse> {
    const detail = await this.deps.companyRepository.findDetailForUser(userId, companyId);

    if (!detail) {
      throw ApiError.notFound(`Company not found: ${companyId}`);
    }

    return mapGetCompanyResponse(detail);
  }
}

export function createCompanyApiService(
  deps: CompanyApiServiceDependencies,
): CompanyApiService {
  return new CompanyApiService(deps);
}
