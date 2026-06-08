export type AgentErrorCode =
  | "INVALID_INPUT"
  | "OPENAI_ERROR"
  | "VALIDATION_ERROR"
  | "EMPTY_RESPONSE"
  | "PARSE_ERROR";

export class AgentError extends Error {
  readonly code: AgentErrorCode;
  readonly cause?: unknown;

  constructor(code: AgentErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "AgentError";
    this.code = code;
    this.cause = cause;
  }
}

export class QueryParserError extends Error {
  readonly code: AgentErrorCode;
  readonly cause?: unknown;

  constructor(code: AgentErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "QueryParserError";
    this.code = code;
    this.cause = cause;
  }

  static fromAgentError(error: AgentError): QueryParserError {
    return new QueryParserError(error.code, error.message, error.cause);
  }
}

export class CompanyExtractionError extends Error {
  readonly code: AgentErrorCode;
  readonly cause?: unknown;

  constructor(code: AgentErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "CompanyExtractionError";
    this.code = code;
    this.cause = cause;
  }

  static fromAgentError(error: AgentError): CompanyExtractionError {
    return new CompanyExtractionError(error.code, error.message, error.cause);
  }
}

export class LeadScoringError extends Error {
  readonly code: AgentErrorCode;
  readonly cause?: unknown;

  constructor(code: AgentErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "LeadScoringError";
    this.code = code;
    this.cause = cause;
  }

  static fromAgentError(error: AgentError): LeadScoringError {
    return new LeadScoringError(error.code, error.message, error.cause);
  }
}
