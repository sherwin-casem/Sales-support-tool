import { requireUser, requireParams, withApiHandler } from "@/lib/api/handler";
import { jsonResponse } from "@/lib/api/http-response";
import { getCampaignApiService } from "@/services/application/campaign-api.factory";
import { z } from "zod";

const CampaignIdParamsSchema = z.object({
  id: z.string().uuid(),
});

const handleSend = withApiHandler(
  async (_request, context) => {
    const user = requireUser(context);
    const params = requireParams(context.params, CampaignIdParamsSchema);
    const result = await getCampaignApiService().sendCampaign(user, params.id);
    return jsonResponse(result, 202);
  },
  { route: "/api/v1/campaigns/:id/send", method: "POST", permission: "campaign:send" },
);

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleSend(request, context);
}
