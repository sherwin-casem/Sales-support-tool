import { createHmac, timingSafeEqual } from "node:crypto";
import { jsonResponse } from "@/lib/api/http-response";
import { getOutreachConfig } from "@/lib/config/outreach.config.js";
import { getDeliveryTrackingService } from "@/services/application/delivery-tracking.service.js";
import type { RecipientStatus } from "@prisma/client";

interface UnipileWebhookPayload {
  event?: string;
  data?: {
    message_id?: string;
    id?: string;
    status?: string;
    timestamp?: string;
  };
}

const EVENT_STATUS_MAP: Record<
  string,
  { status: RecipientStatus; field?: "deliveredAt" | "openedAt" | "repliedAt" }
> = {
  "message.sent": { status: "SENT" },
  "message.delivered": { status: "DELIVERED", field: "deliveredAt" },
  "message.read": { status: "OPENED", field: "openedAt" },
  "message.received": { status: "REPLIED", field: "repliedAt" },
  "message.replied": { status: "REPLIED", field: "repliedAt" },
};

function verifyUnipileSignature(rawBody: string, signatureHeader: string | null, secret: string) {
  if (!secret.trim()) {
    return;
  }

  if (!signatureHeader) {
    throw new Error("Missing Unipile webhook signature");
  }

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");

  if (
    expected.length !== signatureHeader.length ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader))
  ) {
    throw new Error("Invalid Unipile webhook signature");
  }
}

export async function POST(request: Request) {
  const config = getOutreachConfig();
  const rawBody = await request.text();

  verifyUnipileSignature(rawBody, request.headers.get("x-unipile-signature"), config.unipileWebhookSecret);

  const payload = JSON.parse(rawBody) as UnipileWebhookPayload;
  const providerId = payload.data?.message_id ?? payload.data?.id;
  const eventType = payload.event ?? payload.data?.status ?? "unknown";
  const mapping = EVENT_STATUS_MAP[eventType];

  if (!providerId || !mapping) {
    return jsonResponse({ received: true });
  }

  const timestamp = payload.data?.timestamp ? new Date(payload.data.timestamp) : new Date();
  const fields = mapping.field ? { [mapping.field]: timestamp } : undefined;

  await getDeliveryTrackingService().applyDeliveryEvent({
    provider: "unipile",
    providerId,
    eventType,
    status: mapping.status,
    timestamp,
    payload: payload as unknown as Record<string, unknown>,
    fields,
  });

  return jsonResponse({ received: true });
}
