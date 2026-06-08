import { after } from "next/server";
import { getLeadRepository } from "@/repositories/prisma/lead.repository.js";
import { getSearchRepository } from "@/repositories/prisma/search.repository.js";
import {
  createSearchApiService,
  type SearchApiServiceDependencies,
} from "@/services/application/search-api.service.js";
import { getSearchOrchestrator } from "@/services/application/search-orchestrator.factory.js";

export function getSearchApiServiceDependencies(): SearchApiServiceDependencies {
  return {
    searchRepository: getSearchRepository(),
    leadRepository: getLeadRepository(),
    searchOrchestrator: getSearchOrchestrator(),
    scheduleBackgroundTask: (task) => {
      after(task);
    },
  };
}

let cachedService: ReturnType<typeof createSearchApiService> | undefined;

export function getSearchApiService() {
  if (!cachedService) {
    cachedService = createSearchApiService(getSearchApiServiceDependencies());
  }

  return cachedService;
}

export function resetSearchApiServiceCache(): void {
  cachedService = undefined;
}
