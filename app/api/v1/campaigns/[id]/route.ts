import { requireUser, requireParams, withApiHandler } from "@/lib/api/handler";
import { jsonResponse } from "@/lib/api/http-response";
import { getCampaignApiService } from "@/services/application/campaign-api.service";
import { z } from "zod";

const CampaignIdParamsSchema = z.object({
  id: z.string().uuid(),
});

const handleGet = withApiHandler(
  async (_request, context) => {
    const user = requireUser(context);
    const params = requireParams(context.params, CampaignIdParamsSchema);
    const result = await getCampaignApiService().getCampaign(user, params.id);
    return jsonResponse(result);
  },
  { route: "/api/v1/campaigns/:id", method: "GET", permission: "campaign:read" },
);

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleGet(request, context);
}
