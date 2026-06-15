import type { Prisma, RecipientStatus } from "@prisma/client";
import { getCampaignRepository } from "@/repositories/prisma/campaign.repository.js";

export interface DeliveryEventInput {
  provider: string;
  providerId: string;
  eventType: string;
  status: RecipientStatus;
  timestamp?: Date;
  payload?: Record<string, unknown>;
  fields?: Partial<{
    deliveredAt: Date;
    openedAt: Date;
    readAt: Date;
    clickedAt: Date;
    repliedAt: Date;
    bouncedAt: Date;
  }>;
}

const STATUS_RANK: Record<RecipientStatus, number> = {
  PENDING: 0,
  FAILED: 1,
  SENT: 2,
  DELIVERED: 3,
  OPENED: 4,
  CLICKED: 5,
  REPLIED: 6,
  BOUNCED: 2,
  UNSUBSCRIBED: 2,
};

export class DeliveryTrackingService {
  async applyDeliveryEvent(input: DeliveryEventInput): Promise<boolean> {
    const repository = getCampaignRepository();
    const recipient = await repository.findRecipientByProviderId(input.providerId);

    if (!recipient) {
      return false;
    }

    if (STATUS_RANK[input.status] <= STATUS_RANK[recipient.status]) {
      await repository.createDeliveryEvent({
        recipientId: recipient.id,
        provider: input.provider,
        eventType: input.eventType,
        payload: (input.payload ?? {}) as Prisma.InputJsonValue,
        occurredAt: input.timestamp ?? new Date(),
      });
      return true;
    }

    await repository.updateRecipientStatus(recipient.id, input.status, {
      ...(input.fields ?? {}),
    });

    await repository.createDeliveryEvent({
      recipientId: recipient.id,
      provider: input.provider,
      eventType: input.eventType,
      payload: (input.payload ?? {}) as Prisma.InputJsonValue,
      occurredAt: input.timestamp ?? new Date(),
    });

    return true;
  }
}

let cachedService: DeliveryTrackingService | undefined;

export function getDeliveryTrackingService(): DeliveryTrackingService {
  if (!cachedService) {
    cachedService = new DeliveryTrackingService();
  }

  return cachedService;
}
