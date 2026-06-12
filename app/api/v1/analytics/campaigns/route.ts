import { requireUser, withApiHandler } from "@/lib/api/handler";
import { jsonResponse } from "@/lib/api/http-response";
import { parseQueryParamsWithSchema } from "@/lib/api/parse-request";
import { getAnalyticsApiService } from "@/services/application/analytics-api.service";
import { z } from "zod";

const AnalyticsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  campaignId: z.string().uuid().optional(),
});

const handleGet = withApiHandler(
  async (request, context) => {
    const user = requireUser(context);
    const query = parseQueryParamsWithSchema(request, AnalyticsQuerySchema);

    if (query.campaignId) {
      const result = await getAnalyticsApiService().getCampaignDetailAnalytics(
        user,
        query.campaignId,
      );
      return jsonResponse(result);
    }

    const result = await getAnalyticsApiService().getCampaignAnalytics(user, {
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });
    return jsonResponse(result);
  },
  { route: "/api/v1/analytics/campaigns", method: "GET", permission: "analytics:read" },
);

export async function GET(request: Request) {
  return handleGet(request, {});
}
