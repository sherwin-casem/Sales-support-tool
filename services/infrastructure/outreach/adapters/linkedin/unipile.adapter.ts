import { getOutreachConfig } from "@/lib/config/outreach.config.js";
import type { LinkedInProviderPort } from "@/services/infrastructure/outreach/adapters/linkedin/linkedin-delivery.port.js";

const UNIPILE_API_BASE = "https://api.unipile.com/v1";

function extractLinkedInPublicId(profileUrl: string): string {
  const parsed = new URL(profileUrl);
  const segments = parsed.pathname.split("/").filter(Boolean);
  const inIndex = segments.indexOf("in");

  if (inIndex >= 0 && segments[inIndex + 1]) {
    return segments[inIndex + 1]!;
  }

  throw new Error("Invalid LinkedIn profile URL");
}

export class UnipileLinkedInProvider implements LinkedInProviderPort {
  private readonly apiKey: string;
  private readonly accountId: string;

  constructor() {
    const config = getOutreachConfig();
    this.apiKey = config.unipileApiKey;
    this.accountId = config.unipileAccountId;
  }

  async sendMessage(input: {
    profileUrl: string;
    bodyText: string;
    recipientName?: string | null;
  }): Promise<{ messageId: string; metadata?: Record<string, string> }> {
    const publicId = extractLinkedInPublicId(input.profileUrl);

    const response = await fetch(`${UNIPILE_API_BASE}/chats`, {
      method: "POST",
      headers: {
        "X-API-KEY": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        account_id: this.accountId,
        attendees_ids: [publicId],
        text: input.bodyText,
        attendee_name: input.recipientName ?? undefined,
      }),
    });

    const payload = (await response.json()) as {
      id?: string;
      chat_id?: string;
      message_id?: string;
      error?: { message?: string; detail?: string };
    };

    if (!response.ok) {
      throw new Error(
        payload.error?.message ?? payload.error?.detail ?? "Unipile LinkedIn send failed",
      );
    }

    const messageId = payload.message_id ?? payload.id ?? payload.chat_id;

    if (!messageId) {
      throw new Error("Unipile LinkedIn send returned no message id");
    }

    return {
      messageId,
      metadata: { profileUrl: input.profileUrl, publicId },
    };
  }
}
