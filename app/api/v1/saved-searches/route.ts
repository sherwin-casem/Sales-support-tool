import { requireUser, withApiHandler } from "@/lib/api/handler";
import { jsonResponse } from "@/lib/api/http-response";
import { readJsonBodyWithSchema } from "@/lib/api/parse-request";
import { SaveSavedSearchSchema } from "@/lib/validations/api/saved-search.schema.js";
import { getSavedSearchApiService } from "@/services/application/saved-search-api.factory";

const handleList = withApiHandler(
  async (_request, context) => {
    const user = requireUser(context);
    const result = await getSavedSearchApiService().listSavedSearches(user);
    return jsonResponse(result);
  },
  { route: "/api/v1/saved-searches", method: "GET", permission: "saved-search:read" },
);

const handleCreate = withApiHandler(
  async (request, context) => {
    const user = requireUser(context);
    const body = await readJsonBodyWithSchema(request, SaveSavedSearchSchema);
    const result = await getSavedSearchApiService().saveSavedSearch(user, body);
    return jsonResponse(result, 201);
  },
  { route: "/api/v1/saved-searches", method: "POST", permission: "saved-search:write" },
);

export async function GET(request: Request) {
  return handleList(request, {});
}

export async function POST(request: Request) {
  return handleCreate(request, {});
}
