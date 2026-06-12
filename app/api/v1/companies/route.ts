import { requireUser, withApiHandler } from "@/lib/api/handler";
import { jsonResponse } from "@/lib/api/http-response";
import { parseQueryParamsWithSchema } from "@/lib/api/parse-request";
import { ListCompaniesQuerySchema } from "@/lib/validations/api/company.schema";
import { getCompanyApiService } from "@/services/application/company-api.factory";

const handleListCompanies = withApiHandler(
  async (request, context) => {
    const user = requireUser(context);
    const query = parseQueryParamsWithSchema(request, ListCompaniesQuerySchema);
    const result = await getCompanyApiService().listCompanies(user.id, query);

    return jsonResponse(result);
  },
  { route: "/api/v1/companies", method: "GET" },
);

export async function GET(request: Request) {
  return handleListCompanies(request, {});
}
