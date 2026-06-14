import type { UserRole } from "@prisma/client";
import { getPrismaClient } from "@/lib/db/prisma.client.js";

export interface UserRecord {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
}

export interface OrganizationRecord {
  id: string;
  name: string;
  slug: string;
  servicesCatalog: unknown;
}

export class UserRepository {
  async findById(id: string): Promise<UserRecord | null> {
    const user = await getPrismaClient().user.findUnique({ where: { id } });
    return user ? mapUser(user) : null;
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const user = await getPrismaClient().user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    return user ? mapUser(user) : null;
  }

  async listByOrganization(organizationId: string): Promise<UserRecord[]> {
    const users = await getPrismaClient().user.findMany({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
    });
    return users.map(mapUser);
  }

  async createUser(input: {
    organizationId: string;
    email: string;
    passwordHash: string;
    name: string;
    role: UserRole;
  }): Promise<UserRecord> {
    const user = await getPrismaClient().user.create({
      data: {
        organizationId: input.organizationId,
        email: input.email.toLowerCase().trim(),
        passwordHash: input.passwordHash,
        name: input.name,
        role: input.role,
      },
    });
    return mapUser(user);
  }

  async updateUser(
    id: string,
    input: Partial<{
      name: string;
      role: UserRole;
      isActive: boolean;
      passwordHash: string;
    }>,
  ): Promise<UserRecord> {
    const user = await getPrismaClient().user.update({
      where: { id },
      data: input,
    });
    return mapUser(user);
  }

  async organizationSlugExists(slug: string): Promise<boolean> {
    const org = await getPrismaClient().organization.findUnique({
      where: { slug },
      select: { id: true },
    });

    return Boolean(org);
  }

  async getOrganization(organizationId: string): Promise<OrganizationRecord | null> {
    const org = await getPrismaClient().organization.findUnique({
      where: { id: organizationId },
    });
    return org
      ? {
          id: org.id,
          name: org.name,
          slug: org.slug,
          servicesCatalog: org.servicesCatalog,
        }
      : null;
  }

  async updateServicesCatalog(
    organizationId: string,
    servicesCatalog: unknown,
  ): Promise<OrganizationRecord> {
    const org = await getPrismaClient().organization.update({
      where: { id: organizationId },
      data: { servicesCatalog: servicesCatalog as object },
    });
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      servicesCatalog: org.servicesCatalog,
    };
  }
}

function mapUser(user: {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
}): UserRecord {
  return {
    id: user.id,
    organizationId: user.organizationId,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}

let cachedRepository: UserRepository | undefined;

export function getUserRepository(): UserRepository {
  if (!cachedRepository) {
    cachedRepository = new UserRepository();
  }

  return cachedRepository;
}
