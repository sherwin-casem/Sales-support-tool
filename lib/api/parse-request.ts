import { z } from "zod";
import { ApiError, zodErrorToDetails } from "@/lib/api/api-error.js";
import { parseJsonBody } from "@/lib/api/request-utils.js";

export function parseJsonBodyWithSchema<S extends z.ZodTypeAny>(
  schema: S,
  body: unknown,
): z.output<S> {
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    throw ApiError.validationError("Invalid request body", zodErrorToDetails(parsed.error));
  }

  return parsed.data;
}

export async function readJsonBodyWithSchema<S extends z.ZodTypeAny>(
  request: Request,
  schema: S,
): Promise<z.output<S>> {
  let body: unknown;

  try {
    body = await parseJsonBody(request);
  } catch {
    throw ApiError.invalidInput("Request body must be valid JSON");
  }

  return parseJsonBodyWithSchema(schema, body);
}

export function parseQueryParamsWithSchema<S extends z.ZodTypeAny>(
  request: Request,
  schema: S,
): z.output<S> {
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const parsed = schema.safeParse(params);

  if (!parsed.success) {
    throw ApiError.validationError("Invalid query parameters", zodErrorToDetails(parsed.error));
  }

  return parsed.data;
}
