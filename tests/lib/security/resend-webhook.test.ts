import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/api-error.js";
import {
  signResendWebhookPayload,
  verifyResendWebhookSignature,
} from "@/lib/security/resend-webhook.js";

describe("verifyResendWebhookSignature", () => {
  const secret = "whsec_" + Buffer.from("test-webhook-secret").toString("base64");

  it("accepts a valid signature", () => {
    const rawBody = JSON.stringify({ type: "email.delivered", data: { email_id: "email_1" } });
    const webhookId = "msg_123";
    const timestamp = "1710000000";
    const signature = signResendWebhookPayload({
      webhookId,
      timestamp,
      rawBody,
      secret,
    });

    expect(() =>
      verifyResendWebhookSignature(
        { signature, timestamp, webhookId },
        rawBody,
        secret,
      ),
    ).not.toThrow();
  });

  it("rejects an invalid signature", () => {
    const rawBody = JSON.stringify({ type: "email.delivered", data: { email_id: "email_1" } });

    expect(() =>
      verifyResendWebhookSignature(
        {
          signature: "v1,invalid",
          timestamp: "1710000000",
          webhookId: "msg_123",
        },
        rawBody,
        secret,
      ),
    ).toThrow(ApiError);
  });
});
