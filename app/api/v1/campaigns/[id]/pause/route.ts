import { requireUser, requireParams, withApiHandler } from "@/lib/api/handler";
import { jsonResponse } from "@/lib/api/http-response";
import { getCampaignApiService } from "@/services/application/campaign-api.service";
import { z } from "zod";

const CampaignIdParamsSchema = z.object({
  id: z.string().uuid(),
});

const handlePause = withApiHandler(
  async (_request, context) => {
    const user = requireUser(context);
    const params = requireParams(context.params, CampaignIdParamsSchema);
    const result = await getCampaignApiService().pauseCampaign(user, params.id);
    return jsonResponse(result);
  },
  { route: "/api/v1/campaigns/:id/pause", method: "POST", permission: "campaign:send" },
);

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handlePause(request, context);
}
