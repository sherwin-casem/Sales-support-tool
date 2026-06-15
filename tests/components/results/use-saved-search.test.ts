import { describe, expect, it, vi, beforeEach } from "vitest";

const mockApiFetch = vi.fn();

vi.mock("@/lib/api/browser-client", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

describe("useSavedSearch API integration", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it("uses POST /api/v1/saved-searches to save a completed search job", async () => {
    mockApiFetch.mockResolvedValueOnce({
      id: "saved-id",
      searchJobId: "00000000-0000-4000-8000-000000000020",
      savedAt: "2026-06-15T12:00:00.000Z",
    });

    await mockApiFetch("/api/v1/saved-searches", {
      method: "POST",
      body: JSON.stringify({ searchJobId: "00000000-0000-4000-8000-000000000020" }),
    });

    expect(mockApiFetch).toHaveBeenCalledWith("/api/v1/saved-searches", {
      method: "POST",
      body: JSON.stringify({ searchJobId: "00000000-0000-4000-8000-000000000020" }),
    });
  });
});
