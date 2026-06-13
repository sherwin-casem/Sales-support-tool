import { ApiError } from "@/lib/api/api-error.js";
import { jsonResponse } from "@/lib/api/http-response";
import { getOutreachConfig } from "@/lib/config/outreach.config.js";
import { verifyResendWebhookSignature } from "@/lib/security/resend-webhook.js";
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
  const rawBody = await request.text();
  const config = getOutreachConfig();

  verifyResendWebhookSignature(
    {
      signature: request.headers.get("svix-signature"),
      timestamp: request.headers.get("svix-timestamp"),
      webhookId: request.headers.get("svix-id"),
    },
    rawBody,
    config.resendWebhookSecret,
  );

  const payload = JSON.parse(rawBody) as ResendWebhookEvent;
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
