import { jsonResponse } from "@/lib/api/http-response";
import { withWebhookHandler } from "@/lib/api/webhook-handler.js";
import { getOutreachConfig } from "@/lib/config/outreach.config.js";
import { verifyWhatsAppWebhookSignature } from "@/lib/security/whatsapp-webhook.js";
import { getDeliveryTrackingService } from "@/services/application/delivery-tracking.service.js";
import type { RecipientStatus } from "@prisma/client";

interface WhatsAppWebhookPayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        statuses?: Array<{
          id: string;
          status: string;
          timestamp?: string;
        }>;
        messages?: Array<{
          id: string;
          from: string;
          timestamp?: string;
          type?: string;
        }>;
      };
    }>;
  }>;
}

const STATUS_MAP: Record<
  string,
  { status: RecipientStatus; field?: "deliveredAt" | "openedAt" | "readAt" | "repliedAt" }
> = {
  sent: { status: "SENT" },
  delivered: { status: "DELIVERED", field: "deliveredAt" },
  read: { status: "OPENED", field: "readAt" },
  failed: { status: "FAILED" },
};

export async function GET(request: Request) {
  const config = getOutreachConfig();
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === config.whatsappWebhookVerifyToken && challenge) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

async function handleWhatsAppWebhook(request: Request): Promise<Response> {
  const config = getOutreachConfig();
  const rawBody = await request.text();

  verifyWhatsAppWebhookSignature(
    rawBody,
    request.headers.get("x-hub-signature-256"),
    config.whatsappAppSecret,
  );

  const payload = JSON.parse(rawBody) as WhatsAppWebhookPayload;
  const tracking = getDeliveryTrackingService();

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const status of change.value?.statuses ?? []) {
        const mapping = STATUS_MAP[status.status];

        if (!mapping) {
          continue;
        }

        const timestamp = status.timestamp
          ? new Date(Number(status.timestamp) * 1000)
          : new Date();
        const fields = mapping.field ? { [mapping.field]: timestamp } : undefined;

        await tracking.applyDeliveryEvent({
          provider: "whatsapp",
          providerId: status.id,
          eventType: `whatsapp.${status.status}`,
          status: mapping.status,
          timestamp,
          payload: status as unknown as Record<string, unknown>,
          fields,
        });
      }
    }
  }

  return jsonResponse({ received: true });
}

export const POST = withWebhookHandler(handleWhatsAppWebhook, {
  route: "/api/v1/webhooks/whatsapp",
  method: "POST",
});
