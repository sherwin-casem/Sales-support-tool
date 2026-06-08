import {
  createSearchOrchestrator,
  type SearchOrchestratorDependencies,
} from "@/services/application/search-orchestrator.service.js";
import { getCompanyRepository } from "@/repositories/prisma/company.repository.js";
import { getLeadRepository } from "@/repositories/prisma/lead.repository.js";
import { getSearchRepository } from "@/repositories/prisma/search.repository.js";
import { getCompanyDiscoveryService } from "@/services/infrastructure/discovery/company-discovery.service.js";
import { getCompanyExtractionService } from "@/services/infrastructure/ai/company-extraction.service.js";
import { getLeadScoringService } from "@/services/infrastructure/ai/lead-scoring.service.js";
import { getQueryParserService } from "@/services/infrastructure/ai/query-parser.service.js";
import { getWebsiteCrawlerService } from "@/services/infrastructure/crawler/website-crawler.service.js";
import { getTextCleaningService } from "@/services/infrastructure/content/text-cleaning.service.js";

export function createDefaultSearchOrchestratorDependencies(): SearchOrchestratorDependencies {
  return {
    queryParser: getQueryParserService(),
    companyDiscovery: getCompanyDiscoveryService(),
    websiteCrawler: getWebsiteCrawlerService(),
    textCleaning: getTextCleaningService(),
    companyExtraction: getCompanyExtractionService(),
    leadScoring: getLeadScoringService(),
    searchRepository: getSearchRepository(),
    companyRepository: getCompanyRepository(),
    leadRepository: getLeadRepository(),
  };
}

let cachedOrchestrator: ReturnType<typeof createSearchOrchestrator> | undefined;

export function getSearchOrchestrator() {
  if (!cachedOrchestrator) {
    cachedOrchestrator = createSearchOrchestrator(createDefaultSearchOrchestratorDependencies());
  }

  return cachedOrchestrator;
}

export function resetSearchOrchestratorCache(): void {
  cachedOrchestrator = undefined;
}
