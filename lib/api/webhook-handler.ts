import { errorResponse, toApiError } from "@/lib/api/http-response.js";
import { apiLogger } from "@/lib/logging/logger.js";

type WebhookHandler = (request: Request) => Promise<Response>;

export function withWebhookHandler(
  handler: WebhookHandler,
  options: { route: string; method: string },
): (request: Request) => Promise<Response> {
  const { route, method } = options;

  return async (request) => {
    const startedAt = Date.now();

    try {
      const response = await handler(request);

      apiLogger.info("Webhook processed", {
        route,
        method,
        status: response.status,
        durationMs: Date.now() - startedAt,
      });

      return response;
    } catch (error) {
      const apiError = toApiError(error);

      apiLogger.error("Webhook failed", {
        route,
        method,
        status: apiError.status,
        code: apiError.code,
        durationMs: Date.now() - startedAt,
        message: apiError.message,
      });

      return errorResponse(apiError);
    }
  };
}
