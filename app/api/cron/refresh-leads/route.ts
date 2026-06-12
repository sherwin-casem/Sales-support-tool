import { ApiError } from "@/lib/api/api-error";
import { jsonResponse } from "@/lib/api/http-response";
import { getOutreachConfig } from "@/lib/config/outreach.config";
import { getLeadRefreshService } from "@/services/application/lead-refresh.service";

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
    const result = await getLeadRefreshService().processDueSchedules();
    return jsonResponse(result);
  } catch (error) {
    throw ApiError.internal(
      error instanceof Error ? error.message : "Refresh cron failed",
      error,
    );
  }
}
