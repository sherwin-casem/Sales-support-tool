import { getAuthenticatedUserId } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/handler";
import { jsonResponse } from "@/lib/api/http-response";
import { readJsonBodyWithSchema } from "@/lib/api/parse-request";
import { CreateSearchRequestSchema } from "@/lib/validations/api/search.schema";
import { getSearchApiService } from "@/services/application/search-api.factory";

const handleCreateSearch = withApiHandler(
  async (request) => {
    const userId = getAuthenticatedUserId(request);
    const body = await readJsonBodyWithSchema(request, CreateSearchRequestSchema);
    const result = await getSearchApiService().createSearch(userId, body);

    return jsonResponse(result, 202);
  },
  { route: "/api/v1/search", method: "POST" },
);

export async function POST(request: Request) {
  return handleCreateSearch(request, {});
}
