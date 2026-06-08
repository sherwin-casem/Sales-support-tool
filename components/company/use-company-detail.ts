"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiClientError } from "@/lib/api/api-client-error";
import { fetchCompany } from "@/lib/api/browser-client";
import type { GetCompanyResponse } from "@/types/api/company.api.types";

export function useCompanyDetail(companyId: string) {
  const [data, setData] = useState<GetCompanyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);

    try {
      const response = await fetchCompany(companyId);

      if (requestIdRef.current !== requestId) {
        return;
      }

      setData(response);
      setError(null);
    } catch (loadError) {
      if (requestIdRef.current !== requestId) {
        return;
      }

      setError(
        loadError instanceof ApiClientError
          ? loadError.message
          : "Failed to load company details",
      );
    } finally {
      if (requestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    data,
    error,
    isLoading,
    reload: load,
  };
}
