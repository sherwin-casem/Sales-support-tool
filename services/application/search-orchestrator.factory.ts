import {
  createSearchOrchestrator,
  type SearchOrchestratorDependencies,
} from "@/services/application/search-orchestrator.service.js";
import { getCompanyRepository } from "@/repositories/prisma/company.repository.js";
import { getSearchRepository } from "@/repositories/prisma/search.repository.js";
import { getCompanyDiscoveryService } from "@/services/infrastructure/discovery/company-discovery.service.js";
import { getCompanyExtractionService } from "@/services/infrastructure/ai/company-extraction.service.js";
import { getLeadEnrichmentService } from "@/services/infrastructure/ai/lead-enrichment.service.js";
import { getQueryParserService } from "@/services/infrastructure/ai/query-parser.service.js";
import { getPipelineConfig } from "@/lib/config/pipeline.config.js";
import { getWebsiteCrawlerService } from "@/services/infrastructure/crawler/website-crawler.service.js";
import { getTextCleaningService } from "@/services/infrastructure/content/text-cleaning.service.js";

export function createDefaultSearchOrchestratorDependencies(): SearchOrchestratorDependencies {
  return {
    queryParser: getQueryParserService(),
    companyDiscovery: getCompanyDiscoveryService(),
    websiteCrawler: getWebsiteCrawlerService(),
    textCleaning: getTextCleaningService(),
    companyExtraction: getCompanyExtractionService(),
    leadEnrichment: getLeadEnrichmentService(),
    searchRepository: getSearchRepository(),
    companyRepository: getCompanyRepository(),
  };
}

let cachedOrchestrator: ReturnType<typeof createSearchOrchestrator> | undefined;

export function getSearchOrchestrator() {
  if (!cachedOrchestrator) {
    const pipelineConfig = getPipelineConfig();
    cachedOrchestrator = createSearchOrchestrator(createDefaultSearchOrchestratorDependencies(), {
      enrichmentConcurrency: pipelineConfig.SEARCH_ENRICHMENT_CONCURRENCY,
    });
  }

  return cachedOrchestrator;
}

export function resetSearchOrchestratorCache(): void {
  cachedOrchestrator = undefined;
}
