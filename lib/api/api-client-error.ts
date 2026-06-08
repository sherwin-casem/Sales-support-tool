import type { ApiErrorBody } from "@/types/api/error.api.types";

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: ApiErrorBody["error"]["details"];

  constructor(status: number, body: ApiErrorBody["error"]) {
    super(body.message);
    this.name = "ApiClientError";
    this.code = body.code;
    this.status = status;
    this.details = body.details;
  }

  getFieldError(field: string): string | undefined {
    return this.details.find((detail) => detail.field === field)?.message;
  }
}
