"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiClientError } from "@/lib/api/api-client-error";
import { fetchSearchJob } from "@/lib/api/browser-client";
import { isSearchJobActive } from "@/lib/results/search-job-status";
import type { GetSearchResponse } from "@/types/api/search.api.types";

const POLL_INTERVAL_MS = 4000;

export interface SearchJobApiFilters {
  stage?: GetSearchResponse["results"][number]["stage"];
}

export function useSearchJob(searchJobId: string, apiFilters: SearchJobApiFilters) {
  const [data, setData] = useState<GetSearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const requestIdRef = useRef(0);
  const hasLoadedOnceRef = useRef(false);

  const load = useCallback(
    async (options: { initial?: boolean } = {}) => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      if (options.initial) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      try {
        const response = await fetchSearchJob(searchJobId, {
          stage: apiFilters.stage,
          includeFailures: true,
        });

        if (requestIdRef.current !== requestId) {
          return null;
        }

        hasLoadedOnceRef.current = true;
        setData(response);
        setError(null);
        return response;
      } catch (loadError) {
        if (requestIdRef.current !== requestId) {
          return null;
        }

        setError(
          loadError instanceof ApiClientError
            ? loadError.message
            : "Failed to load search results",
        );
        return null;
      } finally {
        if (requestIdRef.current === requestId) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [apiFilters.stage, searchJobId],
  );

  useEffect(() => {
    // Only the very first fetch shows the full-page skeleton; filter changes
    // refresh in the background instead of flashing the loading state.
    void load({ initial: !hasLoadedOnceRef.current });
  }, [load]);

  const isJobActive = data !== null && isSearchJobActive(data.status);

  useEffect(() => {
    if (!isJobActive) {
      return;
    }

    // Depend on the active flag (not the data object) so the interval is not
    // torn down and recreated after every poll response.
    const intervalId = window.setInterval(() => {
      void load();
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [isJobActive, load]);

  return {
    data,
    error,
    isLoading,
    isRefreshing,
    reload: () => load(),
  };
}
