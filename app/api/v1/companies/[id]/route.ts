import { requireUser, withApiHandler, requireParams } from "@/lib/api/handler";
import { jsonResponse } from "@/lib/api/http-response";
import { CompanyIdParamsSchema } from "@/lib/validations/api/company.schema";
import { getCompanyApiService } from "@/services/application/company-api.factory";

const handleGetCompany = withApiHandler(
  async (request, context) => {
    const userId = requireUser(context).id;
    const params = requireParams(context.params, CompanyIdParamsSchema);
    const result = await getCompanyApiService().getCompany(userId, params.id);

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
