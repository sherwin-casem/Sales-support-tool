import { ProxyAgent, type Dispatcher } from "undici";
import type { DiscoveryConfig } from "@/lib/config/discovery.config.js";

export interface HttpResponse {
  ok: boolean;
  status: number;
  text(): Promise<string>;
}

export interface HttpClient {
  get(url: string, init?: RequestInit): Promise<HttpResponse>;
  post(url: string, body: URLSearchParams, init?: RequestInit): Promise<HttpResponse>;
}

export interface FetchHttpClientOptions {
  proxyUrl?: string;
  defaultTimeoutMs?: number;
}

export class FetchHttpClient implements HttpClient {
  private readonly dispatcher?: Dispatcher;

  constructor(private readonly options: FetchHttpClientOptions = {}) {
    if (options.proxyUrl) {
      this.dispatcher = new ProxyAgent(options.proxyUrl);
    }
  }

  async get(url: string, init?: RequestInit): Promise<HttpResponse> {
    const response = await fetch(url, this.buildRequestInit(init));
    return wrapResponse(response);
  }

  async post(
    url: string,
    body: URLSearchParams,
    init?: RequestInit,
  ): Promise<HttpResponse> {
    const response = await fetch(url, {
      ...this.buildRequestInit(init),
      method: "POST",
      headers: mergeHeaders(
        { "Content-Type": "application/x-www-form-urlencoded" },
        init?.headers,
      ),
      body: body.toString(),
    });

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
      ...(this.dispatcher ? { dispatcher: this.dispatcher } : {}),
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

export function createDiscoveryHttpClient(config: DiscoveryConfig): HttpClient {
  return new FetchHttpClient({
    proxyUrl: config.DISCOVERY_HTTP_PROXY,
    defaultTimeoutMs: config.DISCOVERY_DDG_TIMEOUT_MS,
  });
}

export function createWikidataHttpClient(): HttpClient {
  return new FetchHttpClient({ defaultTimeoutMs: 30_000 });
}
