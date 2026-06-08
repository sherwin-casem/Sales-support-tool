import { getCompanyRepository } from "@/repositories/prisma/company.repository.js";
import {
  createCompanyApiService,
  type CompanyApiServiceDependencies,
} from "@/services/application/company-api.service.js";

export function getCompanyApiServiceDependencies(): CompanyApiServiceDependencies {
  return {
    companyRepository: getCompanyRepository(),
  };
}

let cachedService: ReturnType<typeof createCompanyApiService> | undefined;

export function getCompanyApiService() {
  if (!cachedService) {
    cachedService = createCompanyApiService(getCompanyApiServiceDependencies());
  }

  return cachedService;
}

export function resetCompanyApiServiceCache(): void {
  cachedService = undefined;
}
