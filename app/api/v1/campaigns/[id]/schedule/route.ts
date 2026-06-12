import { requireUser, requireParams, withApiHandler } from "@/lib/api/handler";
import { jsonResponse } from "@/lib/api/http-response";
import { readJsonBodyWithSchema } from "@/lib/api/parse-request";
import { getCampaignApiService } from "@/services/application/campaign-api.service";
import { z } from "zod";

const CampaignIdParamsSchema = z.object({
  id: z.string().uuid(),
});

const ScheduleSchema = z.object({
  scheduledAt: z.string().datetime(),
});

const handleSchedule = withApiHandler(
  async (request, context) => {
    const user = requireUser(context);
    const params = requireParams(context.params, CampaignIdParamsSchema);
    const body = await readJsonBodyWithSchema(request, ScheduleSchema);
    const result = await getCampaignApiService().scheduleCampaign(
      user,
      params.id,
      new Date(body.scheduledAt),
    );
    return jsonResponse(result);
  },
  { route: "/api/v1/campaigns/:id/schedule", method: "POST", permission: "campaign:send" },
);

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleSchedule(request, context);
}
