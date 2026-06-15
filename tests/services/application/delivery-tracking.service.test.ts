import { describe, expect, it, vi, beforeEach } from "vitest";
import { DeliveryTrackingService } from "@/services/application/delivery-tracking.service.js";

const mocks = vi.hoisted(() => ({
  findRecipientByProviderId: vi.fn(),
  updateRecipientStatus: vi.fn(),
  createDeliveryEvent: vi.fn(),
}));

vi.mock("@/repositories/prisma/campaign.repository.js", () => ({
  getCampaignRepository: () => ({
    findRecipientByProviderId: mocks.findRecipientByProviderId,
    updateRecipientStatus: mocks.updateRecipientStatus,
    createDeliveryEvent: mocks.createDeliveryEvent,
  }),
}));

describe("DeliveryTrackingService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findRecipientByProviderId.mockResolvedValue({
      id: "recipient-1",
      status: "SENT",
    });
    mocks.updateRecipientStatus.mockResolvedValue(undefined);
    mocks.createDeliveryEvent.mockResolvedValue(undefined);
  });

  it("updates recipient when event advances status", async () => {
    const service = new DeliveryTrackingService();

    await service.applyDeliveryEvent({
      provider: "resend",
      providerId: "msg-1",
      eventType: "email.delivered",
      status: "DELIVERED",
      fields: { deliveredAt: new Date("2026-01-01T00:00:00.000Z") },
    });

    expect(mocks.updateRecipientStatus).toHaveBeenCalledWith(
      "recipient-1",
      "DELIVERED",
      expect.objectContaining({ deliveredAt: expect.any(Date) }),
    );
    expect(mocks.createDeliveryEvent).toHaveBeenCalled();
  });

  it("logs duplicate events without regressing status", async () => {
    mocks.findRecipientByProviderId.mockResolvedValue({
      id: "recipient-1",
      status: "DELIVERED",
    });

    const service = new DeliveryTrackingService();

    await service.applyDeliveryEvent({
      provider: "resend",
      providerId: "msg-1",
      eventType: "email.sent",
      status: "SENT",
    });

    expect(mocks.updateRecipientStatus).not.toHaveBeenCalled();
    expect(mocks.createDeliveryEvent).toHaveBeenCalled();
  });
});
