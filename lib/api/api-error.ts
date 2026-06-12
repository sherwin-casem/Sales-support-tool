import type { ApiErrorCode, ApiErrorDetail } from "@/types/api/error.api.types.js";

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details: ApiErrorDetail[];
  readonly cause?: unknown;

  constructor(
    code: ApiErrorCode,
    message: string,
    status: number,
    details: ApiErrorDetail[] = [],
    cause?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
    this.cause = cause;
  }

  static unauthorized(message = "Unauthorized"): ApiError {
    return new ApiError("UNAUTHORIZED", message, 401);
  }

  static notFound(message: string): ApiError {
    return new ApiError("NOT_FOUND", message, 404);
  }

  static invalidInput(message: string, details: ApiErrorDetail[] = []): ApiError {
    return new ApiError("INVALID_INPUT", message, 400, details);
  }

  static validationError(message: string, details: ApiErrorDetail[] = []): ApiError {
    return new ApiError("VALIDATION_ERROR", message, 422, details);
  }

  static rateLimited(message = "Too many requests", retryAfterSeconds = 60): ApiError {
    const error = new ApiError("RATE_LIMITED", message, 429);
    (error as ApiError & { retryAfterSeconds: number }).retryAfterSeconds = retryAfterSeconds;
    return error;
  }

  static forbidden(message = "Forbidden"): ApiError {
    return new ApiError("FORBIDDEN", message, 403);
  }

  static serviceUnavailable(message = "Service unavailable"): ApiError {
    return new ApiError("SERVICE_UNAVAILABLE", message, 503);
  }

  static internal(message = "Internal server error", cause?: unknown): ApiError {
    return new ApiError("INTERNAL_ERROR", message, 500, [], cause);
  }
}

export function zodErrorToDetails(error: { issues: Array<{ path: (string | number)[]; message: string }> }): ApiErrorDetail[] {
  return error.issues.map((issue) => ({
    field: issue.path.join(".") || undefined,
    message: issue.message,
  }));
}
