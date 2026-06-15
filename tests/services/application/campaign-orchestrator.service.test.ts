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

vi.mock("@/services/infrastructure/outreach/delivery-adapter.registry.js", () => ({
  getDeliveryAdapter: () => ({
    send: mocks.send,
  }),
}));

vi.mock("@/lib/config/outreach.config.js", () => ({
  getOutreachConfig: () => ({
    fromEmail: "sales@parijat.com",
    fromName: "Parijat Sales",
    sendRatePerMinute: 600,
    emailRatePerMinute: 600,
    whatsappRatePerMinute: 600,
    linkedInRatePerMinute: 600,
    resendApiKey: "re_test",
    resendWebhookSecret: "",
    cronSecret: "",
    refreshBatchSize: 10,
    refreshConcurrency: 2,
  }),
  getChannelRatePerMinute: () => 600,
}));

import { CampaignOrchestratorService } from "@/services/application/campaign-orchestrator.service.js";

const baseRecipient = {
  id: "00000000-0000-4000-8000-000000000201",
  campaignId,
  companyId,
  searchResultId: null,
  channel: "EMAIL" as const,
  toAddress: "lead@acme.fi",
  toEmail: "lead@acme.fi",
  toName: "Lead",
  status: "PENDING" as const,
  providerId: null,
  providerMetadata: null,
  sentAt: null,
  deliveredAt: null,
  openedAt: null,
  readAt: null,
  clickedAt: null,
  repliedAt: null,
  bouncedAt: null,
  errorMessage: null,
};

describe("CampaignOrchestratorService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findById.mockResolvedValue({
      id: campaignId,
      userId,
      organizationId: "00000000-0000-4000-8000-000000000010",
      name: "Test",
      channel: "EMAIL",
      status: "RUNNING",
      subject: "Hello",
      bodyHtml: "<p>Hello</p>",
      bodyText: "Hello",
      outreachMessageId: null,
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
    mocks.listPendingRecipients.mockResolvedValue([baseRecipient]);
    mocks.findDetailForUser.mockResolvedValue(null);

    const service = new CampaignOrchestratorService();
    await service.sendCampaign(campaignId, userId);

    expect(mocks.updateRecipientStatus).toHaveBeenCalledWith(
      baseRecipient.id,
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
    mocks.listPendingRecipients.mockResolvedValue([baseRecipient]);
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

    expect(mocks.send).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: "EMAIL",
        toAddress: "lead@acme.fi",
      }),
    );
    expect(mocks.updateRecipientStatus).toHaveBeenCalledWith(
      baseRecipient.id,
      "SENT",
      expect.objectContaining({ providerId: "email_123" }),
    );
    expect(mocks.updateStatus).toHaveBeenLastCalledWith(
      campaignId,
      "COMPLETED",
      expect.objectContaining({ completedAt: expect.any(Date) }),
    );
  });

  it("stops sending when campaign is paused mid-run", async () => {
    mocks.listPendingRecipients.mockResolvedValue([
      baseRecipient,
      { ...baseRecipient, id: "00000000-0000-4000-8000-000000000202" },
    ]);
    mocks.findDetailForUser.mockResolvedValue({
      profile: { structuredData: { decisionMakerEmail: "lead@acme.fi" } },
    });
    mocks.send.mockResolvedValue({ providerId: "email_123" });
    mocks.findById
      .mockResolvedValueOnce({
        id: campaignId,
        userId,
        organizationId: "00000000-0000-4000-8000-000000000010",
        name: "Test",
        channel: "EMAIL",
        status: "RUNNING",
        subject: "Hello",
        bodyHtml: "<p>Hello</p>",
        bodyText: "Hello",
        outreachMessageId: null,
        scheduledAt: null,
        startedAt: new Date(),
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        recipients: [],
      })
      .mockResolvedValueOnce({
        id: campaignId,
        userId,
        channel: "EMAIL",
        status: "RUNNING",
        subject: "Hello",
        bodyHtml: "<p>Hello</p>",
        bodyText: "Hello",
      })
      .mockResolvedValueOnce({
        id: campaignId,
        userId,
        channel: "EMAIL",
        status: "PAUSED",
        subject: "Hello",
        bodyHtml: "<p>Hello</p>",
        bodyText: "Hello",
      });

    const service = new CampaignOrchestratorService();
    await service.sendCampaign(campaignId, userId);

    expect(mocks.send).toHaveBeenCalledTimes(1);
  });
});
