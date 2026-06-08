export type DiscoveryErrorCode =
  | "INVALID_INPUT"
  | "ALL_SOURCES_FAILED"
  | "DISCOVERY_FAILED";

export class DiscoveryError extends Error {
  readonly code: DiscoveryErrorCode;
  readonly cause?: unknown;

  constructor(code: DiscoveryErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "DiscoveryError";
    this.code = code;
    this.cause = cause;
  }
}

export class CompanyDiscoveryError extends Error {
  readonly code: DiscoveryErrorCode;
  readonly cause?: unknown;

  constructor(code: DiscoveryErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "CompanyDiscoveryError";
    this.code = code;
    this.cause = cause;
  }

  static fromDiscoveryError(error: DiscoveryError): CompanyDiscoveryError {
    return new CompanyDiscoveryError(error.code, error.message, error.cause);
  }
}
