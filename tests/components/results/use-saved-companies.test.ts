import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  getSavedCompaniesStorageKey,
  readSavedCompanyIds,
  toggleSavedCompanyId,
} from "@/components/results/use-saved-companies";

describe("use-saved-companies storage", () => {
  const userId = "00000000-0000-4000-8000-000000000001";
  const companyId = "00000000-0000-4000-8000-000000000010";
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      clear: () => storage.clear(),
    });
  });

  it("persists saved company ids in localStorage", () => {
    expect(readSavedCompanyIds(userId).size).toBe(0);

    const saved = toggleSavedCompanyId(userId, companyId);

    expect(saved.has(companyId)).toBe(true);
    expect(storage.get(getSavedCompaniesStorageKey(userId))).toContain(companyId);

    const unsaved = toggleSavedCompanyId(userId, companyId);

    expect(unsaved.has(companyId)).toBe(false);
  });
});
