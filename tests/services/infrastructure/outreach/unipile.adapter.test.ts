import { describe, expect, it, vi, beforeEach } from "vitest";
import { UnipileLinkedInProvider } from "@/services/infrastructure/outreach/adapters/linkedin/unipile.adapter.js";

describe("UnipileLinkedInProvider", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ message_id: "li-msg-1" }),
      }),
    );
  });

  it("sends LinkedIn message via Unipile API", async () => {
    const provider = new UnipileLinkedInProvider();

    const result = await provider.sendMessage({
      profileUrl: "https://linkedin.com/in/janedoe",
      bodyText: "Hello Jane",
      recipientName: "Jane Doe",
    });

    expect(result.messageId).toBe("li-msg-1");
    expect(fetch).toHaveBeenCalledWith(
      "https://api.unipile.com/v1/chats",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
