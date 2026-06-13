import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/api-error.js";
import { OutreachMessageApiService } from "@/services/application/outreach-message-api.service.js";

const user = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "admin@parijat.com",
  name: "Parijat Admin",
  role: "ADMIN" as const,
  organizationId: "00000000-0000-4000-8000-000000000010",
};

describe("OutreachMessageApiService", () => {
  it("throws not found when company profile is missing", async () => {
    vi.spyOn(
      await import("@/repositories/prisma/company.repository.js"),
      "getCompanyRepository",
    ).mockReturnValue({
      findDetailForUser: vi.fn().mockResolvedValue(null),
    } as never);

    const service = new OutreachMessageApiService();

    await expect(
      service.generateMessage(user, {
        companyId: "00000000-0000-4000-8000-000000000010",
        tone: "professional",
        channel: "EMAIL",
      }),
    ).rejects.toEqual(
      ApiError.notFound(
        "Company not found or not enriched: 00000000-0000-4000-8000-000000000010",
      ),
    );
  });
});
