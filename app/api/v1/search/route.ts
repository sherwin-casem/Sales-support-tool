import { requireUser, withApiHandler } from "@/lib/api/handler";
import { jsonResponse } from "@/lib/api/http-response";
import { readJsonBodyWithSchema } from "@/lib/api/parse-request";
import { CreateSearchRequestSchema } from "@/lib/validations/api/search.schema";
import { getSearchApiService } from "@/services/application/search-api.factory";

const handleCreateSearch = withApiHandler(
  async (request, context) => {
    const user = requireUser(context);
    const body = await readJsonBodyWithSchema(request, CreateSearchRequestSchema);
    const result = await getSearchApiService().createSearch(user.id, body);

    return jsonResponse(result, 202);
  },
  { route: "/api/v1/search", method: "POST", permission: "search:create" },
);

export async function POST(request: Request) {
  return handleCreateSearch(request, {});
}
