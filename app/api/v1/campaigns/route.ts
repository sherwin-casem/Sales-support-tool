import { requireUser, withApiHandler } from "@/lib/api/handler";
import { jsonResponse } from "@/lib/api/http-response";
import { readJsonBodyWithSchema } from "@/lib/api/parse-request";
import { getCampaignApiService } from "@/services/application/campaign-api.service";
import { z } from "zod";

const CreateCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  subject: z.string().min(1).max(500),
  bodyHtml: z.string().min(1),
  bodyText: z.string().min(1),
  companyIds: z.array(z.string().uuid()).optional(),
  searchResultIds: z.array(z.string().uuid()).optional(),
});

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
