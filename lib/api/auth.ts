import { timingSafeEqual } from "node:crypto";
import { ApiError } from "@/lib/api/api-error.js";
import {
  getSecurityConfig,
  isProductionAuthRequired,
} from "@/lib/config/security.config.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function getAuthenticatedUserId(request: Request): string {
  const authorization = request.headers.get("authorization");
  const security = getSecurityConfig();

  if (!authorization?.startsWith("Bearer ")) {
    throw ApiError.unauthorized("Missing or invalid Authorization header");
  }

  const token = authorization.slice("Bearer ".length).trim();

  if (security.API_AUTH_SECRET) {
    const prefix = `${security.API_AUTH_SECRET}:`;

    if (!token.startsWith(prefix)) {
      throw ApiError.unauthorized("Invalid API credentials");
    }

    const userId = token.slice(prefix.length).trim();

    if (!UUID_PATTERN.test(userId)) {
      throw ApiError.unauthorized("Bearer token must include a valid user UUID");
    }

    return userId;
  }

  if (isProductionAuthRequired() && !security.ALLOW_DEV_UUID_AUTH) {
    throw ApiError.unauthorized(
      "Production API requires API_AUTH_SECRET or explicit ALLOW_DEV_UUID_AUTH=true",
    );
  }

  if (!UUID_PATTERN.test(token)) {
    throw ApiError.unauthorized("Bearer token must be a valid user UUID");
  }

  return token;
}

export function createBearerToken(userId: string, secret: string): string {
  return `${secret}:${userId}`;
}

export function verifyApiKeyHeader(request: Request, expectedSecret: string): boolean {
  const apiKey = request.headers.get("x-api-key");

  if (!apiKey) {
    return false;
  }

  return safeEqual(apiKey, expectedSecret);
}
