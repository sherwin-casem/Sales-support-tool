import { withCronHandler } from "@/lib/api/cron-handler.js";
import { getCampaignApiService } from "@/services/application/campaign-api.factory";

export const POST = withCronHandler(
  () => getCampaignApiService().processDueScheduledCampaigns(),
  { route: "/api/cron/send-campaigns" },
);
