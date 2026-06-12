import { requireUser, withApiHandler, requireParams } from "@/lib/api/handler";
import { jsonResponse } from "@/lib/api/http-response";
import { CompanyIdParamsSchema } from "@/lib/validations/api/company.schema";
import { getCompanyApiService } from "@/services/application/company-api.factory";

const handleGetCompany = withApiHandler(
  async (request, context) => {
    const user = requireUser(context);
    const params = requireParams(context.params, CompanyIdParamsSchema);
    const result = await getCompanyApiService().getCompany(user.id, params.id);

    return jsonResponse(result);
  },
  { route: "/api/v1/companies/:id", method: "GET" },
);

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleGetCompany(request, context);
}
