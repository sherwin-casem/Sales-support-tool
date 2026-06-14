import { withApiHandler } from "@/lib/api/handler";
import { jsonResponse } from "@/lib/api/http-response";
import { readJsonBodyWithSchema } from "@/lib/api/parse-request";
import { RegisterRequestSchema } from "@/lib/validations/api/auth.schema";
import { getAuthApiService } from "@/services/application/auth-api.factory";

const handleRegister = withApiHandler(
  async (request) => {
    const body = await readJsonBodyWithSchema(request, RegisterRequestSchema);
    const result = await getAuthApiService().register(body);

    return jsonResponse(result, 201);
  },
  { requireAuth: false, route: "/api/v1/auth/register", method: "POST" },
);

export async function POST(request: Request) {
  return handleRegister(request, {});
}
