export type CrawlErrorCode =
  | "INVALID_INPUT"
  | "SSRF_BLOCKED"
  | "ROBOTS_DISALLOWED"
  | "CRAWL_TIMEOUT"
  | "BROWSER_ERROR"
  | "CRAWL_FAILED";

export class CrawlError extends Error {
  readonly code: CrawlErrorCode;
  readonly cause?: unknown;

  constructor(code: CrawlErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "CrawlError";
    this.code = code;
    this.cause = cause;
  }
}

export class WebsiteCrawlerError extends Error {
  readonly code: CrawlErrorCode;
  readonly cause?: unknown;

  constructor(code: CrawlErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "WebsiteCrawlerError";
    this.code = code;
    this.cause = cause;
  }

  static fromCrawlError(error: CrawlError): WebsiteCrawlerError {
    return new WebsiteCrawlerError(error.code, error.message, error.cause);
  }
}
