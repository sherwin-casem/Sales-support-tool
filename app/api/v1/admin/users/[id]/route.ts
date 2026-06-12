import { requireUser, requireParams, withApiHandler } from "@/lib/api/handler";
import { jsonResponse } from "@/lib/api/http-response";
import { readJsonBodyWithSchema } from "@/lib/api/parse-request";
import { getAdminApiService } from "@/services/application/admin-api.service";
import { z } from "zod";
import type { UserRole } from "@prisma/client";

const UserIdParamsSchema = z.object({
  id: z.string().uuid(),
});

const UpdateUserSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  role: z.enum(["ADMIN", "MANAGER", "SALES_REP"]).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

const handlePatch = withApiHandler(
  async (request, context) => {
    const user = requireUser(context);
    const params = requireParams(context.params, UserIdParamsSchema);
    const body = await readJsonBodyWithSchema(request, UpdateUserSchema);
    const updated = await getAdminApiService().updateUser(user, params.id, {
      ...body,
      ...(body.role ? { role: body.role as UserRole } : {}),
    });
    return jsonResponse(updated);
  },
  { route: "/api/v1/admin/users/:id", method: "PATCH", permission: "user:manage" },
);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handlePatch(request, context);
}
