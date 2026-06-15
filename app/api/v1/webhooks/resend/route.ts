import { jsonResponse } from "@/lib/api/http-response";
import { getOutreachConfig } from "@/lib/config/outreach.config.js";
import { verifyResendWebhookSignature } from "@/lib/security/resend-webhook.js";
import { getDeliveryTrackingService } from "@/services/application/delivery-tracking.service.js";
import type { RecipientStatus } from "@prisma/client";

interface ResendWebhookEvent {
  type: string;
  data: {
    email_id?: string;
    created_at?: string;
  };
}

const EVENT_STATUS_MAP: Record<
  string,
  { status: RecipientStatus; field?: "deliveredAt" | "openedAt" | "clickedAt" | "bouncedAt" }
> = {
  "email.sent": { status: "SENT" },
  "email.delivered": { status: "DELIVERED", field: "deliveredAt" },
  "email.opened": { status: "OPENED", field: "openedAt" },
  "email.clicked": { status: "CLICKED", field: "clickedAt" },
  "email.bounced": { status: "BOUNCED", field: "bouncedAt" },
  "email.complained": { status: "UNSUBSCRIBED" },
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

  const mapping = EVENT_STATUS_MAP[payload.type];

  if (!mapping) {
    return jsonResponse({ received: true });
  }

  const timestamp = payload.data.created_at ? new Date(payload.data.created_at) : new Date();
  const fields = mapping.field ? { [mapping.field]: timestamp } : undefined;

  await getDeliveryTrackingService().applyDeliveryEvent({
    provider: "resend",
    providerId,
    eventType: payload.type,
    status: mapping.status,
    timestamp,
    payload: payload as unknown as Record<string, unknown>,
    fields,
  });

  return jsonResponse({ received: true });
}
