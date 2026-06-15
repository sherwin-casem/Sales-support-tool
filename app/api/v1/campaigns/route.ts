import { requireUser, withApiHandler } from "@/lib/api/handler";
import { jsonResponse } from "@/lib/api/http-response";
import { readJsonBodyWithSchema } from "@/lib/api/parse-request";
import { CreateCampaignSchema } from "@/lib/validations/campaign.schema.js";
import { getCampaignApiService } from "@/services/application/campaign-api.factory";

const handleCreate = withApiHandler(
  async (request, context) => {
    const user = requireUser(context);
    const body = await readJsonBodyWithSchema(request, CreateCampaignSchema);
    const result = await getCampaignApiService().createCampaign(user, body);
    return jsonResponse(result, 201);
  },
  { route: "/api/v1/campaigns", method: "POST", permission: "campaign:create" },
);

const handleList = withApiHandler(
  async (_request, context) => {
    const user = requireUser(context);
    const result = await getCampaignApiService().listCampaigns(user);
    return jsonResponse({ data: result });
  },
  { route: "/api/v1/campaigns", method: "GET", permission: "campaign:read" },
);

export async function POST(request: Request) {
  return handleCreate(request, {});
}

export async function GET(request: Request) {
  return handleList(request, {});
}
