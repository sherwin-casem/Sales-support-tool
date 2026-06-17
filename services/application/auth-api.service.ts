import { hash } from "bcryptjs";
import { ApiError } from "@/lib/api/api-error.js";
import { getSecurityConfig } from "@/lib/config/security.config.js";
import { resolveUniqueOrganizationSlug } from "@/services/domain/organization/organization-slug.js";
import { getPrismaClient } from "@/lib/db/prisma.client.js";
import type { RegisterRequestInput } from "@/lib/validations/api/auth.schema.js";
import { getUserRepository } from "@/repositories/prisma/user.repository.js";

export class AuthApiService {
  async register(input: RegisterRequestInput) {
    const security = getSecurityConfig();

    if (!security.ALLOW_PUBLIC_SIGNUP) {
      throw ApiError.forbidden("Public signup is disabled");
    }

    const email = input.email.toLowerCase().trim();
    const existing = await getUserRepository().findByEmail(email);

    if (existing) {
      throw ApiError.validationError("Email already in use");
    }

    const slug = await resolveUniqueOrganizationSlug(input.orgName, (candidate) =>
      getUserRepository().organizationSlugExists(candidate),
    );

    const passwordHash = await hash(input.password, 12);

    const user = await getPrismaClient().$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: input.orgName.trim(),
          slug,
          servicesCatalog: [],
        },
      });

      return tx.user.create({
        data: {
          organizationId: organization.id,
          email,
          passwordHash,
          name: input.name.trim(),
          role: "ADMIN",
          isActive: true,
        },
      });
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }
}
