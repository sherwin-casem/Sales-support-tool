import { requireUser, withApiHandler } from "@/lib/api/handler";
import { jsonResponse } from "@/lib/api/http-response";
import { readJsonBodyWithSchema } from "@/lib/api/parse-request";
import { parseQueryParamsWithSchema } from "@/lib/api/parse-request";
import { GenerateOutreachMessageSchema } from "@/lib/validations/outreach-message.schema";
import { z } from "zod";
import { getOutreachMessageApiService } from "@/services/application/outreach-message-api.service";

const ListQuerySchema = z.object({
  companyId: z.string().uuid(),
});

const handleGenerate = withApiHandler(
  async (request, context) => {
    const user = requireUser(context);
    const body = await readJsonBodyWithSchema(request, GenerateOutreachMessageSchema);
    const result = await getOutreachMessageApiService().generateMessage(user, body);
    return jsonResponse(result, 201);
  },
  { route: "/api/v1/outreach/messages", method: "POST", permission: "outreach:generate" },
);

const handleList = withApiHandler(
  async (request, context) => {
    const user = requireUser(context);
    const query = parseQueryParamsWithSchema(request, ListQuerySchema);
    const result = await getOutreachMessageApiService().listMessages(user, query.companyId);
    return jsonResponse({ data: result });
  },
  { route: "/api/v1/outreach/messages", method: "GET", permission: "outreach:generate" },
);

export async function POST(request: Request) {
  return handleGenerate(request, {});
}

export async function GET(request: Request) {
  return handleList(request, {});
}
