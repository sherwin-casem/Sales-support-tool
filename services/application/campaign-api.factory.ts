import { after } from "next/server";
import { getCampaignRepository } from "@/repositories/prisma/campaign.repository.js";
import { getCompanyRepository } from "@/repositories/prisma/company.repository.js";
import {
  createCampaignApiService,
  type CampaignApiService,
} from "@/services/application/campaign-api.service.js";
import { getCampaignOrchestratorService } from "@/services/application/campaign-orchestrator.service.js";

let cachedService: CampaignApiService | undefined;

export function getCampaignApiService(): CampaignApiService {
  if (!cachedService) {
    cachedService = createCampaignApiService({
      campaignRepository: getCampaignRepository(),
      companyRepository: getCompanyRepository(),
      campaignOrchestrator: getCampaignOrchestratorService(),
      scheduleBackgroundTask: (task) => {
        after(task);
      },
    });
  }

  return cachedService;
}

export function resetCampaignApiServiceCache(): void {
  cachedService = undefined;
}
