import type { ParsedQuery } from "@/types/agents/query-parser.types.js";

export function hasParsedCriteria(
  criteria: ParsedQuery | Record<string, unknown>,
): criteria is ParsedQuery {
  return (
    typeof criteria === "object" &&
    criteria !== null &&
    "industry" in criteria &&
    "location" in criteria &&
    "employeeRange" in criteria
  );
}
