import { requireUser, requireParams, withApiHandler } from "@/lib/api/handler";
import { jsonResponse } from "@/lib/api/http-response";
import { getSavedSearchApiService } from "@/services/application/saved-search-api.factory";
import { z } from "zod";

const SavedSearchIdParamsSchema = z.object({
  id: z.string().uuid(),
});

const handleDelete = withApiHandler(
  async (_request, context) => {
    const user = requireUser(context);
    const params = requireParams(context.params, SavedSearchIdParamsSchema);
    const result = await getSavedSearchApiService().deleteSavedSearch(user, params.id);
    return jsonResponse(result);
  },
  { route: "/api/v1/saved-searches/:id", method: "DELETE", permission: "saved-search:write" },
);

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleDelete(request, context);
}
