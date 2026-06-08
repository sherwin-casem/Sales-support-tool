import { z } from "zod";

export const EMPLOYEE_RANGE_PATTERN = /^(?:\d+-\d+|\d+\+|unknown)$/;

export const ParsedQuerySchema = z.object({
  industry: z
    .string()
    .min(1, "industry is required")
    .max(200, "industry must be at most 200 characters")
    .transform((value) => value.trim().toLowerCase()),
  location: z
    .string()
    .min(1, "location is required")
    .max(200, "location must be at most 200 characters")
    .transform((value) => value.trim()),
  employeeRange: z
    .string()
    .min(1, "employeeRange is required")
    .max(50, "employeeRange must be at most 50 characters")
    .transform((value) => value.trim().toLowerCase())
    .refine(
      (value) => EMPLOYEE_RANGE_PATTERN.test(value),
      "employeeRange must match 50-200, 100+, or unknown",
    ),
});

export type ParsedQueryOutput = z.infer<typeof ParsedQuerySchema>;

export const QueryParserInputSchema = z.object({
  query: z
    .string()
    .trim()
    .min(1, "query must not be empty")
    .max(500, "query must be at most 500 characters"),
  locale: z.string().min(2).max(10).optional(),
  promptVersion: z.string().min(1).max(20).optional(),
});

export const PARSED_QUERY_JSON_SCHEMA = {
  type: "object",
  properties: {
    industry: {
      type: "string",
      description:
        "Primary industry or sector in lowercase (e.g. logistics, saas, manufacturing). Use unknown if not specified.",
    },
    location: {
      type: "string",
      description:
        "Country, region, or city (e.g. Finland, Berlin, United States). Use unknown if not specified.",
    },
    employeeRange: {
      type: "string",
      description:
        "Employee count range: N-M (e.g. 50-200), N+ (e.g. 100+), or unknown if not specified.",
    },
  },
  required: ["industry", "location", "employeeRange"],
  additionalProperties: false,
} as const;
