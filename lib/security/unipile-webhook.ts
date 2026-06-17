import { createHmac, timingSafeEqual } from "node:crypto";
import { ApiError } from "@/lib/api/api-error.js";

export function verifyUnipileWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): void {
  if (!secret.trim()) {
    if (process.env.NODE_ENV === "production") {
      throw ApiError.unauthorized("Unipile webhook secret is not configured");
    }

    return;
  }

  if (!signatureHeader) {
    throw ApiError.unauthorized("Missing Unipile webhook signature");
  }

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");

  if (
    expected.length !== signatureHeader.length ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader))
  ) {
    throw ApiError.unauthorized("Invalid Unipile webhook signature");
  }
}
