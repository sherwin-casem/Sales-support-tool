import { jsonResponse } from "@/lib/api/http-response";
import { getCampaignRepository } from "@/repositories/prisma/campaign.repository";
import type { RecipientStatus } from "@prisma/client";

interface ResendWebhookEvent {
  type: string;
  data: {
    email_id?: string;
    created_at?: string;
  };
}

const EVENT_STATUS_MAP: Record<string, RecipientStatus> = {
  "email.sent": "SENT",
  "email.delivered": "DELIVERED",
  "email.opened": "OPENED",
  "email.clicked": "CLICKED",
  "email.bounced": "BOUNCED",
  "email.complained": "UNSUBSCRIBED",
};

export async function POST(request: Request) {
  const payload = (await request.json()) as ResendWebhookEvent;
  const providerId = payload.data?.email_id;

  if (!providerId) {
    return jsonResponse({ received: true });
  }

  const recipient = await getCampaignRepository().findRecipientByProviderId(providerId);

  if (!recipient) {
    return jsonResponse({ received: true });
  }

  const status = EVENT_STATUS_MAP[payload.type];

  if (!status) {
    return jsonResponse({ received: true });
  }

  const timestamp = payload.data.created_at ? new Date(payload.data.created_at) : new Date();

  await getCampaignRepository().updateRecipientStatus(recipient.id, status, {
    ...(status === "DELIVERED" ? { deliveredAt: timestamp } : {}),
    ...(status === "OPENED" ? { openedAt: timestamp } : {}),
    ...(status === "CLICKED" ? { clickedAt: timestamp } : {}),
    ...(status === "BOUNCED" ? { bouncedAt: timestamp } : {}),
  });

  return jsonResponse({ received: true });
}
