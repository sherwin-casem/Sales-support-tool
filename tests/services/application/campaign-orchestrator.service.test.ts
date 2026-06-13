import { beforeEach, describe, expect, it, vi } from "vitest";

const campaignId = "00000000-0000-4000-8000-000000000100";
const userId = "00000000-0000-4000-8000-000000000001";
const companyId = "00000000-0000-4000-8000-000000000010";

const mocks = vi.hoisted(() => ({
  findById: vi.fn(),
  updateStatus: vi.fn(),
  listPendingRecipients: vi.fn(),
  updateRecipientStatus: vi.fn(),
  findDetailForUser: vi.fn(),
  send: vi.fn(),
}));

vi.mock("@/repositories/prisma/campaign.repository.js", () => ({
  getCampaignRepository: () => ({
    findById: mocks.findById,
    updateStatus: mocks.updateStatus,
    listPendingRecipients: mocks.listPendingRecipients,
    updateRecipientStatus: mocks.updateRecipientStatus,
  }),
}));

vi.mock("@/repositories/prisma/company.repository.js", () => ({
  getCompanyRepository: () => ({
    findDetailForUser: mocks.findDetailForUser,
  }),
}));

vi.mock("@/services/infrastructure/email/resend-email.adapter.js", () => ({
  getResendEmailAdapter: () => ({
    send: mocks.send,
  }),
}));

vi.mock("@/lib/config/outreach.config.js", () => ({
  getOutreachConfig: () => ({
    fromEmail: "sales@parijat.com",
    fromName: "Parijat Sales",
    sendRatePerMinute: 600,
    resendApiKey: "re_test",
    resendWebhookSecret: "",
    cronSecret: "",
    refreshBatchSize: 10,
    refreshConcurrency: 2,
  }),
}));

import { CampaignOrchestratorService } from "@/services/application/campaign-orchestrator.service.js";

describe("CampaignOrchestratorService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findById.mockResolvedValue({
      id: campaignId,
      userId,
      organizationId: "00000000-0000-4000-8000-000000000010",
      name: "Test",
      status: "RUNNING",
      subject: "Hello",
      bodyHtml: "<p>Hello</p>",
      bodyText: "Hello",
      scheduledAt: null,
      startedAt: new Date(),
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      recipients: [],
    });
    mocks.updateStatus.mockResolvedValue(undefined);
    mocks.updateRecipientStatus.mockResolvedValue(undefined);
  });

  it("marks campaign failed when every recipient fails", async () => {
    mocks.listPendingRecipients.mockResolvedValue([
      {
        id: "00000000-0000-4000-8000-000000000201",
        campaignId,
        companyId,
        searchResultId: null,
        toEmail: "lead@acme.fi",
        toName: "Lead",
        status: "PENDING",
        providerId: null,
        sentAt: null,
        deliveredAt: null,
        openedAt: null,
        clickedAt: null,
        repliedAt: null,
        bouncedAt: null,
        errorMessage: null,
      },
    ]);
    mocks.findDetailForUser.mockResolvedValue(null);

    const service = new CampaignOrchestratorService();
    await service.sendCampaign(campaignId, userId);

    expect(mocks.updateRecipientStatus).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000201",
      "FAILED",
      expect.objectContaining({ errorMessage: "Company profile not found" }),
    );
    expect(mocks.updateStatus).toHaveBeenLastCalledWith(
      campaignId,
      "FAILED",
      expect.objectContaining({ completedAt: expect.any(Date) }),
    );
  });

  it("marks campaign completed when at least one recipient is sent", async () => {
    mocks.listPendingRecipients.mockResolvedValue([
      {
        id: "00000000-0000-4000-8000-000000000201",
        campaignId,
        companyId,
        searchResultId: null,
        toEmail: "lead@acme.fi",
        toName: "Lead",
        status: "PENDING",
        providerId: null,
        sentAt: null,
        deliveredAt: null,
        openedAt: null,
        clickedAt: null,
        repliedAt: null,
        bouncedAt: null,
        errorMessage: null,
      },
    ]);
    mocks.findDetailForUser.mockResolvedValue({
      profile: {
        structuredData: {
          decisionMakerEmail: "lead@acme.fi",
        },
      },
    });
    mocks.send.mockResolvedValue({ providerId: "email_123" });

    const service = new CampaignOrchestratorService();
    await service.sendCampaign(campaignId, userId);

    expect(mocks.updateRecipientStatus).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000201",
      "SENT",
      expect.objectContaining({ providerId: "email_123" }),
    );
    expect(mocks.updateStatus).toHaveBeenLastCalledWith(
      campaignId,
      "COMPLETED",
      expect.objectContaining({ completedAt: expect.any(Date) }),
    );
  });
});
