export const QUERY_PARSER_PROMPT_VERSION = "v1";

export interface QueryParserInput {
  query: string;
  locale?: string;
  promptVersion?: string;
}

export interface ParsedQuery {
  industry: string;
  location: string;
  employeeRange: string;
}

export interface ParsedQueryMeta {
  promptVersion: string;
  model: string;
  parsedAt: string;
}

export interface ParsedQueryWithMeta extends ParsedQuery {
  rawQuery: string;
  _meta: ParsedQueryMeta;
}
