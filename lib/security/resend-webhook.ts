import { createHmac, timingSafeEqual } from "node:crypto";
import { ApiError } from "@/lib/api/api-error.js";

export function verifyResendWebhookSignature(
  headers: {
    signature: string | null;
    timestamp: string | null;
    webhookId: string | null;
  },
  rawBody: string,
  secret: string,
): void {
  if (!secret.trim()) {
    if (process.env.NODE_ENV === "production") {
      throw ApiError.unauthorized("Resend webhook secret is not configured");
    }

    return;
  }

  if (!headers.signature || !headers.timestamp || !headers.webhookId) {
    throw ApiError.unauthorized("Missing Resend webhook signature headers");
  }

  const signedContent = `${headers.webhookId}.${headers.timestamp}.${rawBody}`;
  const secretBytes = decodeWebhookSecret(secret);
  const expectedSignature = createHmac("sha256", secretBytes)
    .update(signedContent)
    .digest("base64");

  const signatures = headers.signature
    .split(" ")
    .map((part) => part.trim())
    .filter((part) => part.startsWith("v1,"))
    .map((part) => part.slice(3));

  const isValid = signatures.some((signature) =>
    safeCompare(signature, expectedSignature),
  );

  if (!isValid) {
    throw ApiError.unauthorized("Invalid Resend webhook signature");
  }
}

export function signResendWebhookPayload(input: {
  webhookId: string;
  timestamp: string;
  rawBody: string;
  secret: string;
}): string {
  const signedContent = `${input.webhookId}.${input.timestamp}.${input.rawBody}`;
  const secretBytes = decodeWebhookSecret(input.secret);
  const signature = createHmac("sha256", secretBytes)
    .update(signedContent)
    .digest("base64");

  return `v1,${signature}`;
}

function decodeWebhookSecret(secret: string): Buffer {
  const normalized = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  return Buffer.from(normalized, "base64");
}

function safeCompare(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}
