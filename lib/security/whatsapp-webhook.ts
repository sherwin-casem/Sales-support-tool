import { createHmac, timingSafeEqual } from "node:crypto";
import { ApiError } from "@/lib/api/api-error.js";

export function verifyWhatsAppWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): void {
  if (!appSecret.trim()) {
    if (process.env.NODE_ENV === "production") {
      throw ApiError.unauthorized("WhatsApp app secret is not configured");
    }

    return;
  }

  if (!signatureHeader?.startsWith("sha256=")) {
    throw ApiError.unauthorized("Missing WhatsApp webhook signature");
  }

  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const provided = signatureHeader.slice("sha256=".length);

  if (
    expected.length !== provided.length ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(provided))
  ) {
    throw ApiError.unauthorized("Invalid WhatsApp webhook signature");
  }
}
