import { describe, expect, it, vi, beforeEach } from "vitest";
import { AuthApiService } from "@/services/application/auth-api.service.js";
import { ApiError } from "@/lib/api/api-error.js";
import { resetSecurityConfigCache } from "@/lib/config/security.config.js";

vi.mock("bcryptjs", () => ({
  hash: vi.fn().mockResolvedValue("hashed-password"),
}));

describe("AuthApiService", () => {
  beforeEach(() => {
    resetSecurityConfigCache();
    process.env.ALLOW_PUBLIC_SIGNUP = "true";
  });

  it("registers a new organization and admin user", async () => {
    vi.spyOn(
      await import("@/repositories/prisma/user.repository.js"),
      "getUserRepository",
    ).mockReturnValue({
      findByEmail: vi.fn().mockResolvedValue(null),
      organizationSlugExists: vi.fn().mockResolvedValue(false),
    } as never);

    const transaction = vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        organization: {
          create: vi.fn().mockResolvedValue({
            id: "org-1",
            name: "Acme Corp",
            slug: "acme-corp",
          }),
        },
        user: {
          create: vi.fn().mockResolvedValue({
            id: "user-1",
            email: "owner@acme.com",
            name: "Owner",
          }),
        },
      }),
    );

    vi.spyOn(await import("@/lib/db/prisma.client.js"), "getPrismaClient").mockReturnValue({
      $transaction: transaction,
    } as never);

    const service = new AuthApiService();
    const result = await service.register({
      orgName: "Acme Corp",
      name: "Owner",
      email: "owner@acme.com",
      password: "password123",
    });

    expect(result).toEqual({
      id: "user-1",
      email: "owner@acme.com",
      name: "Owner",
    });
    expect(transaction).toHaveBeenCalledOnce();
  });

  it("rejects duplicate email", async () => {
    vi.spyOn(
      await import("@/repositories/prisma/user.repository.js"),
      "getUserRepository",
    ).mockReturnValue({
      findByEmail: vi.fn().mockResolvedValue({ id: "existing" }),
    } as never);

    const service = new AuthApiService();

    await expect(
      service.register({
        orgName: "Acme Corp",
        name: "Owner",
        email: "existing@acme.com",
        password: "password123",
      }),
    ).rejects.toEqual(ApiError.validationError("Email already in use"));
  });

  it("rejects registration when public signup is disabled", async () => {
    process.env.ALLOW_PUBLIC_SIGNUP = "false";
    resetSecurityConfigCache();

    const service = new AuthApiService();

    await expect(
      service.register({
        orgName: "Acme Corp",
        name: "Owner",
        email: "owner@acme.com",
        password: "password123",
      }),
    ).rejects.toEqual(ApiError.forbidden("Public signup is disabled"));
  });
});
