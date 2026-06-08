import { getAuthenticatedUserId } from "@/lib/api/auth";
import { withApiHandler, requireParams } from "@/lib/api/handler";
import { jsonResponse } from "@/lib/api/http-response";
import { parseQueryParamsWithSchema } from "@/lib/api/parse-request";
import {
  GetSearchQuerySchema,
  SearchIdParamsSchema,
} from "@/lib/validations/api/search.schema";
import { getSearchApiService } from "@/services/application/search-api.factory";

const handleGetSearch = withApiHandler(
  async (request, context) => {
    const userId = getAuthenticatedUserId(request);
    const params = requireParams(context.params, SearchIdParamsSchema);
    const query = parseQueryParamsWithSchema(request, GetSearchQuerySchema);
    const result = await getSearchApiService().getSearch(userId, params.id, query);

    return jsonResponse(result);
  },
  { route: "/api/v1/search/:id", method: "GET" },
);

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleGetSearch(request, context);
}
