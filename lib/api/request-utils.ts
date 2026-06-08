import { ApiError } from "@/lib/api/api-error.js";
import { getSecurityConfig } from "@/lib/config/security.config.js";

export function toIsoString(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

export function buildPaginationMeta(
  page: number,
  pageSize: number,
  totalItems: number,
) {
  return {
    page,
    pageSize,
    totalItems,
    totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize),
  };
}

export async function parseJsonBody(request: Request): Promise<unknown> {
  const maxBytes = getSecurityConfig().API_MAX_JSON_BODY_BYTES;
  const rawBody = await request.text();

  if (Buffer.byteLength(rawBody, "utf8") > maxBytes) {
    throw ApiError.invalidInput(`Request body exceeds ${maxBytes} bytes`);
  }

  if (!rawBody.trim()) {
    throw ApiError.invalidInput("Request body must not be empty");
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw ApiError.invalidInput("Request body must be valid JSON");
  }
}
