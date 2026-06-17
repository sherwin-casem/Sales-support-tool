import { ApiError } from "@/lib/api/api-error.js";
import { errorResponse, jsonResponse, toApiError } from "@/lib/api/http-response.js";
import { apiLogger } from "@/lib/logging/logger.js";
import { getOutreachConfig } from "@/lib/config/outreach.config.js";

type CronHandler = () => Promise<unknown>;

export function withCronHandler(
  handler: CronHandler,
  options: { route: string },
): (request: Request) => Promise<Response> {
  const { route } = options;

  return async (request) => {
    const startedAt = Date.now();

    try {
      const config = getOutreachConfig();
      const secret = request.headers.get("authorization");

      if (!config.cronSecret || secret !== `Bearer ${config.cronSecret}`) {
        throw ApiError.unauthorized("Unauthorized");
      }

      const result = await handler();

      apiLogger.info("Cron job completed", {
        route,
        durationMs: Date.now() - startedAt,
      });

      return jsonResponse(result);
    } catch (error) {
      const apiError = toApiError(error);

      apiLogger.error("Cron job failed", {
        route,
        status: apiError.status,
        code: apiError.code,
        durationMs: Date.now() - startedAt,
        message: apiError.message,
      });

      return errorResponse(apiError);
    }
  };
}
