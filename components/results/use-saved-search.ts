"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/browser-client";
import type {
  ListSavedSearchesResponse,
  SaveSavedSearchResponse,
} from "@/types/api/saved-search.api.types.js";

export function useSavedSearch(searchJobId: string) {
  const [savedSearchId, setSavedSearchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savePending, setSavePending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch<ListSavedSearchesResponse>("/api/v1/saved-searches");
      const match = response.data.find((item) => item.searchJobId === searchJobId) ?? null;
      setSavedSearchId(match?.id ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load saved searches.");
    } finally {
      setLoading(false);
    }
  }, [searchJobId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const isSaved = savedSearchId !== null;

  const saveSearch = useCallback(async () => {
    setSavePending(true);
    setError(null);

    try {
      const response = await apiFetch<SaveSavedSearchResponse>("/api/v1/saved-searches", {
        method: "POST",
        body: JSON.stringify({ searchJobId }),
      });
      setSavedSearchId(response.id);
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Failed to save search results.";
      setError(message);
      throw saveError;
    } finally {
      setSavePending(false);
    }
  }, [searchJobId]);

  return {
    isSaved,
    saveSearch,
    reload,
    loading,
    savePending,
    error,
  };
}
