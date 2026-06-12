import { hash } from "bcryptjs";
import type { UserRole } from "@prisma/client";
import { ApiError } from "@/lib/api/api-error.js";
import { getUserRepository } from "@/repositories/prisma/user.repository.js";
import type { AuthenticatedUser } from "@/types/auth/session.types.js";

export class AdminApiService {
  async listUsers(user: AuthenticatedUser) {
    const users = await getUserRepository().listByOrganization(user.organizationId);
    return users.map((record) => ({
      id: record.id,
      email: record.email,
      name: record.name,
      role: record.role,
      isActive: record.isActive,
      createdAt: record.createdAt.toISOString(),
    }));
  }

  async createUser(
    user: AuthenticatedUser,
    input: { email: string; name: string; password: string; role: UserRole },
  ) {
    const existing = await getUserRepository().findByEmail(input.email);

    if (existing) {
      throw ApiError.validationError("Email already in use");
    }

    const passwordHash = await hash(input.password, 12);
    const created = await getUserRepository().createUser({
      organizationId: user.organizationId,
      email: input.email,
      passwordHash,
      name: input.name,
      role: input.role,
    });

    return {
      id: created.id,
      email: created.email,
      name: created.name,
      role: created.role,
      isActive: created.isActive,
    };
  }

  async updateUser(
    user: AuthenticatedUser,
    userId: string,
    input: Partial<{ name: string; role: UserRole; isActive: boolean; password: string }>,
  ) {
    const target = await getUserRepository().findById(userId);

    if (!target || target.organizationId !== user.organizationId) {
      throw ApiError.notFound("User not found");
    }

    const updated = await getUserRepository().updateUser(userId, {
      ...(input.name ? { name: input.name } : {}),
      ...(input.role ? { role: input.role } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.password ? { passwordHash: await hash(input.password, 12) } : {}),
    });

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      isActive: updated.isActive,
    };
  }

  async getServicesCatalog(user: AuthenticatedUser) {
    const org = await getUserRepository().getOrganization(user.organizationId);

    if (!org) {
      throw ApiError.notFound("Organization not found");
    }

    return { servicesCatalog: org.servicesCatalog };
  }

  async updateServicesCatalog(user: AuthenticatedUser, servicesCatalog: unknown) {
    const org = await getUserRepository().updateServicesCatalog(
      user.organizationId,
      servicesCatalog,
    );
    return { servicesCatalog: org.servicesCatalog };
  }
}

let cachedService: AdminApiService | undefined;

export function getAdminApiService(): AdminApiService {
  if (!cachedService) {
    cachedService = new AdminApiService();
  }

  return cachedService;
}
