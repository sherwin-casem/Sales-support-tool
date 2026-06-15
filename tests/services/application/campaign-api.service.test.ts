import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/api-error.js";
import {
  CampaignApiService,
  type CampaignApiServiceDependencies,
} from "@/services/application/campaign-api.service.js";

const user = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "admin@parijat.com",
  name: "Parijat Admin",
  role: "ADMIN" as const,
  organizationId: "00000000-0000-4000-8000-000000000010",
};

const campaignId = "00000000-0000-4000-8000-000000000100";

function createDependencies(
  overrides: Partial<CampaignApiServiceDependencies> = {},
): CampaignApiServiceDependencies {
  return {
    campaignRepository: {
      createCampaign: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: campaignId,
        userId: user.id,
        organizationId: user.organizationId,
        name: "Test campaign",
        channel: "EMAIL",
        status: "DRAFT",
        subject: "Hello",
        bodyHtml: "<p>Hello</p>",
        bodyText: "Hello",
        scheduledAt: null,
        startedAt: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        recipients: [],
      }),
      listForUser: vi.fn(),
      updateStatus: vi.fn().mockResolvedValue({
        id: campaignId,
        status: "RUNNING",
      }),
      countRecipientsByStatus: vi.fn(),
      listDueScheduledCampaigns: vi.fn().mockResolvedValue([]),
    } as unknown as CampaignApiServiceDependencies["campaignRepository"],
    companyRepository: {
      findBySearchResultForUser: vi.fn(),
      findDetailForUser: vi.fn(),
    } as unknown as CampaignApiServiceDependencies["companyRepository"],
    campaignOrchestrator: {
      sendCampaign: vi.fn().mockResolvedValue(undefined),
    },
    scheduleBackgroundTask: (task) => {
      void task();
    },
    getOutreachConfig: () => ({
      fromEmail: "sales@parijat.com",
      fromName: "Parijat Sales",
      sendRatePerMinute: 50,
      emailRatePerMinute: 50,
      whatsappRatePerMinute: 20,
      linkedInRatePerMinute: 10,
      resendApiKey: "re_test",
      resendWebhookSecret: "",
      whatsappAccessToken: "",
      whatsappPhoneNumberId: "",
      unipileApiKey: "",
      unipileAccountId: "",
      cronSecret: "",
      refreshBatchSize: 10,
      refreshConcurrency: 2,
    }),
    ...overrides,
  };
}

describe("CampaignApiService", () => {
  it("returns 503 when RESEND_API_KEY is missing", async () => {
    const deps = createDependencies({
      getOutreachConfig: () => ({
        fromEmail: "sales@parijat.com",
        fromName: "Parijat Sales",
        sendRatePerMinute: 50,
        emailRatePerMinute: 50,
        whatsappRatePerMinute: 20,
        linkedInRatePerMinute: 10,
        resendApiKey: "",
        resendWebhookSecret: "",
        whatsappAccessToken: "",
        whatsappPhoneNumberId: "",
        unipileApiKey: "",
        unipileAccountId: "",
        cronSecret: "",
        refreshBatchSize: 10,
        refreshConcurrency: 2,
      }),
    });
    const service = new CampaignApiService(deps);

    await expect(service.sendCampaign(user, campaignId)).rejects.toEqual(
      ApiError.serviceUnavailable(
        "Email delivery is not configured. Set RESEND_API_KEY to send campaigns.",
      ),
    );
  });

  it("starts background send and returns RUNNING", async () => {
    const scheduleBackgroundTask = vi.fn((task: () => void | Promise<void>) => {
      void task();
    });
    const sendCampaign = vi.fn().mockResolvedValue(undefined);
    const updateStatus = vi.fn().mockResolvedValue({ id: campaignId, status: "RUNNING" });
    const deps = createDependencies({
      campaignRepository: {
        ...createDependencies().campaignRepository,
        updateStatus,
      } as CampaignApiServiceDependencies["campaignRepository"],
      campaignOrchestrator: { sendCampaign },
      scheduleBackgroundTask,
    });
    const service = new CampaignApiService(deps);

    const result = await service.sendCampaign(user, campaignId);

    expect(result).toEqual({ id: campaignId, status: "RUNNING" });
    expect(updateStatus).toHaveBeenCalledWith(
      campaignId,
      "RUNNING",
      expect.objectContaining({ startedAt: expect.any(Date) }),
    );
    expect(scheduleBackgroundTask).toHaveBeenCalledTimes(1);
    expect(sendCampaign).toHaveBeenCalledWith(campaignId, user.id);
  });

  it("processes due scheduled campaigns", async () => {
    const dueCampaign = {
      id: campaignId,
      userId: user.id,
      organizationId: user.organizationId,
      name: "Scheduled",
      channel: "EMAIL" as const,
      status: "SCHEDULED" as const,
      subject: "Hello",
      bodyHtml: "<p>Hello</p>",
      bodyText: "Hello",
      scheduledAt: new Date("2026-06-01T10:00:00.000Z"),
      startedAt: null,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const listDueScheduledCampaigns = vi.fn().mockResolvedValue([dueCampaign]);
    const updateStatus = vi.fn().mockResolvedValue(dueCampaign);
    const scheduleBackgroundTask = vi.fn((task: () => void | Promise<void>) => {
      void task();
    });
    const sendCampaign = vi.fn().mockResolvedValue(undefined);

    const deps = createDependencies({
      campaignRepository: {
        ...createDependencies().campaignRepository,
        listDueScheduledCampaigns,
        updateStatus,
      } as CampaignApiServiceDependencies["campaignRepository"],
      campaignOrchestrator: { sendCampaign },
      scheduleBackgroundTask,
    });
    const service = new CampaignApiService(deps);

    const result = await service.processDueScheduledCampaigns();

    expect(result.processedCampaignIds).toEqual([campaignId]);
    expect(scheduleBackgroundTask).toHaveBeenCalledTimes(1);
    expect(sendCampaign).toHaveBeenCalledWith(campaignId, user.id);
  });
});
