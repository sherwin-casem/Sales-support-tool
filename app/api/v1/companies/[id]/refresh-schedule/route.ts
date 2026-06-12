import { requireUser, requireParams, withApiHandler } from "@/lib/api/handler";
import { jsonResponse } from "@/lib/api/http-response";
import { readJsonBodyWithSchema } from "@/lib/api/parse-request";
import { CompanyIdParamsSchema } from "@/lib/validations/api/company.schema";
import { getLeadRefreshService } from "@/services/application/lead-refresh.service";
import { z } from "zod";

const RefreshScheduleSchema = z.object({
  enabled: z.boolean(),
  intervalDays: z.number().int().min(7).max(90).default(30),
});

const handleGet = withApiHandler(
  async (_request, context) => {
    const user = requireUser(context);
    const params = requireParams(context.params, CompanyIdParamsSchema);
    const schedule = await getLeadRefreshService().getSchedule(user.id, params.id);
    return jsonResponse(schedule);
  },
  { route: "/api/v1/companies/:id/refresh-schedule", method: "GET", permission: "refresh:manage" },
);

const handlePut = withApiHandler(
  async (request, context) => {
    const user = requireUser(context);
    const params = requireParams(context.params, CompanyIdParamsSchema);
    const body = await readJsonBodyWithSchema(request, RefreshScheduleSchema);
    const schedule = await getLeadRefreshService().upsertSchedule({
      userId: user.id,
      companyId: params.id,
      intervalDays: body.intervalDays,
      enabled: body.enabled,
    });
    return jsonResponse(schedule);
  },
  { route: "/api/v1/companies/:id/refresh-schedule", method: "PUT", permission: "refresh:manage" },
);

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleGet(request, context);
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handlePut(request, context);
}
