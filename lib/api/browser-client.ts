import { ApiClientError } from "@/lib/api/api-client-error";
import { getClientAuthorizationHeader } from "@/lib/config/client-auth";
import type { ApiErrorBody } from "@/types/api/error.api.types";
import type { CreateSearchRequestInput } from "@/lib/validations/api/search.schema";
import type { GetCompanyResponse } from "@/types/api/company.api.types";
import type { CreateSearchResponse, GetSearchResponse } from "@/types/api/search.api.types";
import type { GetSearchQueryInput } from "@/lib/validations/api/search.schema";

async function parseErrorResponse(response: Response): Promise<ApiClientError> {
  let body: ApiErrorBody;

  try {
    body = (await response.json()) as ApiErrorBody;
  } catch {
    throw new ApiClientError(response.status, {
      code: "INTERNAL_ERROR",
      message: "Unexpected server response",
      details: [],
    });
  }

  throw new ApiClientError(response.status, body.error);
}

export async function createSearchRequest(
  input: CreateSearchRequestInput,
): Promise<CreateSearchResponse> {
  const response = await fetch("/api/v1/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: getClientAuthorizationHeader(),
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    await parseErrorResponse(response);
  }

  return response.json() as Promise<CreateSearchResponse>;
}

function buildSearchQueryString(
  query: Partial<GetSearchQueryInput> = {},
): string {
  const params = new URLSearchParams();

  if (query.stage) {
    params.set("stage", query.stage);
  }

  if (query.includeFailures === false) {
    params.set("includeFailures", "false");
  }

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

export async function fetchSearchJob(
  searchJobId: string,
  query: Partial<GetSearchQueryInput> = {},
): Promise<GetSearchResponse> {
  const response = await fetch(
    `/api/v1/search/${searchJobId}${buildSearchQueryString(query)}`,
    {
      headers: {
        Authorization: getClientAuthorizationHeader(),
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    await parseErrorResponse(response);
  }

  return response.json() as Promise<GetSearchResponse>;
}

export async function fetchCompany(companyId: string): Promise<GetCompanyResponse> {
  const response = await fetch(`/api/v1/companies/${companyId}`, {
    headers: {
      Authorization: getClientAuthorizationHeader(),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    await parseErrorResponse(response);
  }

  return response.json() as Promise<GetCompanyResponse>;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", getClientAuthorizationHeader());

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    await parseErrorResponse(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
