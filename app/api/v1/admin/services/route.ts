import { requireUser, withApiHandler } from "@/lib/api/handler";
import { jsonResponse } from "@/lib/api/http-response";
import { readJsonBodyWithSchema } from "@/lib/api/parse-request";
import { getAdminApiService } from "@/services/application/admin-api.service";
import { z } from "zod";

const ServicesCatalogSchema = z.object({
  servicesCatalog: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      valueProps: z.array(z.string()),
      targetIndustries: z.array(z.string()),
    }),
  ),
});

const handleGet = withApiHandler(
  async (_request, context) => {
    const user = requireUser(context);
    const result = await getAdminApiService().getServicesCatalog(user);
    return jsonResponse(result);
  },
  { route: "/api/v1/admin/services", method: "GET", permission: "org:services:edit" },
);

const handlePut = withApiHandler(
  async (request, context) => {
    const user = requireUser(context);
    const body = await readJsonBodyWithSchema(request, ServicesCatalogSchema);
    const result = await getAdminApiService().updateServicesCatalog(
      user,
      body.servicesCatalog,
    );
    return jsonResponse(result);
  },
  { route: "/api/v1/admin/services", method: "PUT", permission: "org:services:edit" },
);

export async function GET(request: Request) {
  return handleGet(request, {});
}

export async function PUT(request: Request) {
  return handlePut(request, {});
}
