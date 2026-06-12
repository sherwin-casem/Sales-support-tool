import { ApiError } from "@/lib/api/api-error.js";
import { auth } from "@/lib/auth/auth.js";
import {
  getSecurityConfig,
  isProductionAuthRequired,
} from "@/lib/config/security.config.js";
import type { AuthenticatedUser } from "@/types/auth/session.types.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseBearerUserId(request: Request): string | null {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice("Bearer ".length).trim();
  const security = getSecurityConfig();

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
    return null;
  }

  if (!UUID_PATTERN.test(token)) {
    throw ApiError.unauthorized("Bearer token must be a valid user UUID");
  }

  return token;
}

export async function getAuthenticatedUser(request: Request): Promise<AuthenticatedUser> {
  const bearerUserId = parseBearerUserId(request);

  if (bearerUserId) {
    const { getPrismaClient } = await import("@/lib/db/prisma.client.js");
    const user = await getPrismaClient().user.findUnique({
      where: { id: bearerUserId },
    });

    if (!user?.isActive) {
      throw ApiError.unauthorized("User not found or inactive");
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
    };
  }

  const session = await auth();

  if (!session?.user?.id) {
    throw ApiError.unauthorized("Missing or invalid session");
  }

  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? "",
    role: session.user.role,
    organizationId: session.user.organizationId,
  };
}

/** @deprecated Use getAuthenticatedUser instead */
export async function getAuthenticatedUserId(request: Request): Promise<string> {
  const user = await getAuthenticatedUser(request);
  return user.id;
}
