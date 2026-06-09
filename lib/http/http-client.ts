export interface HttpResponse {
  ok: boolean;
  status: number;
  text(): Promise<string>;
}

export interface HttpClient {
  get(url: string, init?: RequestInit): Promise<HttpResponse>;
}

export interface FetchHttpClientOptions {
  defaultTimeoutMs?: number;
}

export class FetchHttpClient implements HttpClient {
  constructor(private readonly options: FetchHttpClientOptions = {}) {}

  async get(url: string, init?: RequestInit): Promise<HttpResponse> {
    const response = await fetch(url, this.buildRequestInit(init));
    return wrapResponse(response);
  }

  private buildRequestInit(init?: RequestInit): RequestInit {
    const signal =
      init?.signal ??
      (this.options.defaultTimeoutMs
        ? AbortSignal.timeout(this.options.defaultTimeoutMs)
        : undefined);

    return {
      ...init,
      signal,
      headers: mergeHeaders(undefined, init?.headers),
    };
  }
}

function mergeHeaders(
  base: Record<string, string> | undefined,
  headers?: HeadersInit,
): Record<string, string> {
  return {
    ...base,
    ...toRecord(headers),
  };
}

function wrapResponse(response: Response): HttpResponse {
  return {
    ok: response.ok,
    status: response.status,
    text: () => response.text(),
  };
}

function toRecord(headers?: HeadersInit): Record<string, string> {
  if (!headers) {
    return {};
  }

  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }

  return headers;
}

export const httpClient = new FetchHttpClient();
