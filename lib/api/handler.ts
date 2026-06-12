import { apiLogger } from "@/lib/logging/logger.js";
import { ApiError } from "@/lib/api/api-error.js";
import { getClientIp, getRateLimiter } from "@/lib/api/rate-limit.js";
import { errorResponse, toApiError } from "@/lib/api/http-response.js";
import { getAuthenticatedUserId } from "@/lib/api/auth.js";
import { getSecurityConfig } from "@/lib/config/security.config.js";
import {
  requirePermission,
  type Permission,
} from "@/lib/auth/permissions.js";
import { getUserRepository } from "@/repositories/prisma/user.repository.js";
import type { AuthenticatedUser } from "@/types/auth/session.types.js";

export interface RouteContext {
  params?: Record<string, string>;
  user?: AuthenticatedUser;
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
  options: {
    requireAuth?: boolean;
    route: string;
    method: string;
    permission?: Permission;
  },
): (request: Request, routeContext: NextRouteContext) => Promise<Response> {
  const requireAuth = options.requireAuth ?? true;
  const { route, method, permission } = options;

  return async (request, routeContext) => {
    const startedAt = Date.now();
    const resolvedContext: RouteContext = {
      params: await resolveParams(routeContext?.params),
    };

    try {
      let userId: string | undefined;

      if (requireAuth) {
        userId = getAuthenticatedUserId(request);
        const userRecord = await getUserRepository().findById(userId);

        if (!userRecord || !userRecord.isActive) {
          throw ApiError.unauthorized("User not found or inactive");
        }

        if (permission) {
          requirePermission(userRecord.role, permission);
        }

        resolvedContext.user = {
          id: userRecord.id,
          email: userRecord.email,
          name: userRecord.name,
          role: userRecord.role,
          organizationId: userRecord.organizationId,
        };
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

export function requireUser(context: RouteContext): AuthenticatedUser {
  if (!context.user) {
    throw ApiError.unauthorized("Authentication required");
  }

  return context.user;
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
