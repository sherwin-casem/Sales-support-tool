"use client";

import { useCallback, useEffect, useState } from "react";
import { getClientUserId } from "@/lib/config/client-auth";

export function getSavedCompaniesStorageKey(userId: string): string {
  return `saved-companies:${userId}`;
}

function getLocalStorage(): Storage | null {
  if (typeof globalThis.localStorage === "undefined") {
    return null;
  }

  return globalThis.localStorage;
}

export function readSavedCompanyIds(userId: string): Set<string> {
  const storage = getLocalStorage();

  if (!storage) {
    return new Set();
  }

  try {
    const raw = storage.getItem(getSavedCompaniesStorageKey(userId));

    if (!raw) {
      return new Set();
    }

    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return new Set();
    }

    return new Set(parsed.filter((value): value is string => typeof value === "string"));
  } catch {
    return new Set();
  }
}

export function writeSavedCompanyIds(userId: string, ids: Set<string>): void {
  const storage = getLocalStorage();

  if (!storage) {
    return;
  }

  storage.setItem(getSavedCompaniesStorageKey(userId), JSON.stringify([...ids]));
}

export function toggleSavedCompanyId(userId: string, companyId: string): Set<string> {
  const current = readSavedCompanyIds(userId);
  const next = new Set(current);

  if (next.has(companyId)) {
    next.delete(companyId);
  } else {
    next.add(companyId);
  }

  writeSavedCompanyIds(userId, next);
  return next;
}

export function useSavedCompanies() {
  const userId = getClientUserId();
  const [savedIds, setSavedIds] = useState<Set<string>>(() => readSavedCompanyIds(userId));

  useEffect(() => {
    setSavedIds(readSavedCompanyIds(userId));
  }, [userId]);

  const isSaved = useCallback(
    (companyId: string) => savedIds.has(companyId),
    [savedIds],
  );

  const toggleSave = useCallback(
    (companyId: string) => {
      setSavedIds(toggleSavedCompanyId(userId, companyId));
    },
    [userId],
  );

  return { isSaved, toggleSave };
}
