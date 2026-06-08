import type { ApiErrorBody } from "@/types/api/error.api.types.js";
import { ApiError } from "@/lib/api/api-error.js";

export function jsonResponse<T>(body: T, status = 200): Response {
  return Response.json(body, { status });
}

export function errorResponse(error: ApiError): Response {
  const body: ApiErrorBody = {
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
    },
  };

  const headers = new Headers();

  if (error.code === "RATE_LIMITED") {
    const retryAfterSeconds =
      (error as ApiError & { retryAfterSeconds?: number }).retryAfterSeconds ?? 60;
    headers.set("Retry-After", String(retryAfterSeconds));
  }

  return Response.json(body, { status: error.status, headers });
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  return ApiError.internal(
    error instanceof Error ? error.message : "Unexpected error",
    error,
  );
}
