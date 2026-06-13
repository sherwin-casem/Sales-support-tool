import { ApiError } from "@/lib/api/api-error.js";
import { jsonResponse } from "@/lib/api/http-response";
import { getOutreachConfig } from "@/lib/config/outreach.config";
import { getCampaignApiService } from "@/services/application/campaign-api.factory";

export async function POST(request: Request) {
  const config = getOutreachConfig();
  const secret = request.headers.get("authorization");

  if (!config.cronSecret || secret !== `Bearer ${config.cronSecret}`) {
    return jsonResponse(
      { error: { code: "UNAUTHORIZED", message: "Unauthorized", details: [] } },
      401,
    );
  }

  try {
    const result = await getCampaignApiService().processDueScheduledCampaigns();
    return jsonResponse(result);
  } catch (error) {
    throw ApiError.internal(
      error instanceof Error ? error.message : "Campaign send cron failed",
      error,
    );
  }
}
