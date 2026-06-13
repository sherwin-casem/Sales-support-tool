import { describe, expect, it, vi } from "vitest";
import { AdminApiService } from "@/services/application/admin-api.service.js";
import { ApiError } from "@/lib/api/api-error.js";

const adminUser = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "admin@parijat.com",
  name: "Parijat Admin",
  role: "ADMIN" as const,
  organizationId: "00000000-0000-4000-8000-000000000010",
};

describe("AdminApiService", () => {
  it("lists users in the admin organization", async () => {
    const listByOrganization = vi.fn().mockResolvedValue([
      {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
        isActive: true,
        createdAt: new Date("2026-06-01T10:00:00.000Z"),
      },
    ]);

    vi.spyOn(
      await import("@/repositories/prisma/user.repository.js"),
      "getUserRepository",
    ).mockReturnValue({
      listByOrganization,
    } as never);

    const service = new AdminApiService();
    const users = await service.listUsers(adminUser);

    expect(users).toHaveLength(1);
    expect(users[0]?.email).toBe("admin@parijat.com");
    expect(listByOrganization).toHaveBeenCalledWith(adminUser.organizationId);
  });

  it("rejects duplicate email on create", async () => {
    vi.spyOn(
      await import("@/repositories/prisma/user.repository.js"),
      "getUserRepository",
    ).mockReturnValue({
      findByEmail: vi.fn().mockResolvedValue({ id: "existing" }),
    } as never);

    const service = new AdminApiService();

    await expect(
      service.createUser(adminUser, {
        email: "existing@parijat.com",
        name: "Existing",
        password: "password123",
        role: "SALES_REP",
      }),
    ).rejects.toEqual(ApiError.validationError("Email already in use"));
  });
});
