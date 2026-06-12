import { requireUser, withApiHandler } from "@/lib/api/handler";
import { jsonResponse } from "@/lib/api/http-response";
import { readJsonBodyWithSchema } from "@/lib/api/parse-request";
import { getAdminApiService } from "@/services/application/admin-api.service";
import { z } from "zod";
import type { UserRole } from "@prisma/client";

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(200),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "MANAGER", "SALES_REP"]),
});

const handleList = withApiHandler(
  async (_request, context) => {
    const user = requireUser(context);
    const users = await getAdminApiService().listUsers(user);
    return jsonResponse({ data: users });
  },
  { route: "/api/v1/admin/users", method: "GET", permission: "user:manage" },
);

const handleCreate = withApiHandler(
  async (request, context) => {
    const user = requireUser(context);
    const body = await readJsonBodyWithSchema(request, CreateUserSchema);
    const created = await getAdminApiService().createUser(user, {
      ...body,
      role: body.role as UserRole,
    });
    return jsonResponse(created, 201);
  },
  { route: "/api/v1/admin/users", method: "POST", permission: "user:manage" },
);

export async function GET(request: Request) {
  return handleList(request, {});
}

export async function POST(request: Request) {
  return handleCreate(request, {});
}
