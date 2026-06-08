import { apiLogger } from "@/lib/logging/logger.js";
import { ApiError } from "@/lib/api/api-error.js";
import { getClientIp, getRateLimiter } from "@/lib/api/rate-limit.js";
import { errorResponse, toApiError } from "@/lib/api/http-response.js";
import { getAuthenticatedUserId } from "@/lib/api/auth.js";
import { getSecurityConfig } from "@/lib/config/security.config.js";

export interface RouteContext {
  params?: Record<string, string>;
}

type NextRouteContext = {
  params?: Promise<Record<string, string>>;
};

type RouteHandler = (
  request: Request,
  context: RouteContext,
) => Promise<Response>;

async function resolveParams(
  params: NextRouteContext["params"],
): Promise<Record<string, string> | undefined> {
  if (!params) {
    return undefined;
  }

  return params;
}

export function withApiHandler(
  handler: RouteHandler,
  options: { requireAuth?: boolean; route: string; method: string },
): (request: Request, routeContext: NextRouteContext) => Promise<Response> {
  const requireAuth = options.requireAuth ?? true;
  const { route, method } = options;

  return async (request, routeContext) => {
    const startedAt = Date.now();
    const resolvedContext: RouteContext = {
      params: await resolveParams(routeContext?.params),
    };

    try {
      let userId: string | undefined;

      if (requireAuth) {
        userId = getAuthenticatedUserId(request);
      }

      enforceRateLimit(request, { route, method, userId });

      const response = await handler(request, resolvedContext);

      apiLogger.info("API request completed", {
        route,
        method,
        status: response.status,
        durationMs: Date.now() - startedAt,
      });

      return response;
    } catch (error) {
      const apiError = toApiError(error);

      apiLogger.error("API request failed", {
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

export function requireParams(
  params: Record<string, string> | undefined,
  schema: { safeParse: (value: unknown) => { success: boolean; data?: unknown; error?: unknown } },
): Record<string, string> {
  const parsed = schema.safeParse(params ?? {});

  if (!parsed.success) {
    throw ApiError.invalidInput("Invalid path parameters", formatZodIssues(parsed.error));
  }

  return parsed.data as Record<string, string>;
}

function formatZodIssues(error: unknown): Array<{ field?: string; message: string }> {
  if (
    typeof error === "object" &&
    error !== null &&
    "issues" in error &&
    Array.isArray((error as { issues: unknown }).issues)
  ) {
    return (error as { issues: Array<{ path: (string | number)[]; message: string }> }).issues.map(
      (issue) => ({
        field: issue.path.join(".") || undefined,
        message: issue.message,
      }),
    );
  }

  return [];
}

function enforceRateLimit(
  request: Request,
  context: { route: string; method: string; userId?: string },
): void {
  const security = getSecurityConfig();
  const ip = getClientIp(request);
  const globalLimiter = getRateLimiter(
    "api-global",
    security.API_RATE_LIMIT_MAX_REQUESTS,
    security.API_RATE_LIMIT_WINDOW_MS,
  );
  const globalResult = globalLimiter.consume(`${ip}:${context.method}`);

  if (!globalResult.allowed) {
    throw ApiError.rateLimited(
      "Too many API requests",
      globalResult.retryAfterSeconds,
    );
  }

  if (context.method === "POST" && context.route === "/api/v1/search" && context.userId) {
    const searchLimiter = getRateLimiter(
      "api-search",
      security.API_SEARCH_RATE_LIMIT_MAX,
      security.API_RATE_LIMIT_WINDOW_MS,
    );
    const searchResult = searchLimiter.consume(context.userId);

    if (!searchResult.allowed) {
      throw ApiError.rateLimited(
        "Too many search requests",
        searchResult.retryAfterSeconds,
      );
    }
  }
}
