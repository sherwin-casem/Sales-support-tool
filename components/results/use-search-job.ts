"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiClientError } from "@/lib/api/api-client-error";
import { fetchSearchJob, stopSearchJob } from "@/lib/api/browser-client";
import { isSearchJobActive } from "@/lib/results/search-job-status";
import type { GetSearchResponse } from "@/types/api/search.api.types";

const POLL_INTERVAL_MS = 4000;

export interface SearchJobApiFilters {
  stage?: GetSearchResponse["results"][number]["stage"];
}

export function useSearchJob(searchJobId: string, apiFilters: SearchJobApiFilters) {
  const [data, setData] = useState<GetSearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [controlError, setControlError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isControlPending, setIsControlPending] = useState(false);
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
    void load({ initial: !hasLoadedOnceRef.current });
  }, [load]);

  const isJobActive = data !== null && isSearchJobActive(data.status);

  useEffect(() => {
    if (!isJobActive) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void load();
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [isJobActive, load]);

  const stopJob = useCallback(async () => {
    setIsControlPending(true);
    setControlError(null);

    try {
      await stopSearchJob(searchJobId);
      await load();
    } catch (stopError) {
      setControlError(
        stopError instanceof ApiClientError
          ? stopError.message
          : "Failed to stop search",
      );
    } finally {
      setIsControlPending(false);
    }
  }, [load, searchJobId]);

  return {
    data,
    error,
    controlError,
    isLoading,
    isRefreshing,
    isJobActive,
    isControlPending,
    reload: () => load(),
    stopJob,
  };
}
