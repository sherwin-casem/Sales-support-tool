import { requireUser, requireParams, withApiHandler } from "@/lib/api/handler";
import { jsonResponse } from "@/lib/api/http-response";
import { SearchIdParamsSchema } from "@/lib/validations/api/search.schema";
import { getSearchApiService } from "@/services/application/search-api.factory";

const handleStop = withApiHandler(
  async (_request, context) => {
    const userId = requireUser(context).id;
    const params = requireParams(context.params, SearchIdParamsSchema);
    const result = await getSearchApiService().stopSearch(userId, params.id);
    return jsonResponse(result);
  },
  { route: "/api/v1/search/:id/stop", method: "POST" },
);

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleStop(request, context);
}
