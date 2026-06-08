import { getAuthenticatedUserId } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/handler";
import { jsonResponse } from "@/lib/api/http-response";
import { parseQueryParamsWithSchema } from "@/lib/api/parse-request";
import { ListCompaniesQuerySchema } from "@/lib/validations/api/company.schema";
import { getCompanyApiService } from "@/services/application/company-api.factory";

const handleListCompanies = withApiHandler(
  async (request) => {
    const userId = getAuthenticatedUserId(request);
    const query = parseQueryParamsWithSchema(request, ListCompaniesQuerySchema);
    const result = await getCompanyApiService().listCompanies(userId, query);

    return jsonResponse(result);
  },
  { route: "/api/v1/companies", method: "GET" },
);

export async function GET(request: Request) {
  return handleListCompanies(request, {});
}
