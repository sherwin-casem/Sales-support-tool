import { z } from "zod";

const optionalHint = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();

    if (!trimmed || trimmed.toLowerCase() === "unknown") {
      return undefined;
    }

    return trimmed;
  },
  z
    .string()
    .max(200)
    .transform((hint) => hint.toLowerCase())
    .optional(),
);

export const CompanyDiscoveryInputSchema = z.object({
  query: z
    .string()
    .trim()
    .min(1, "query must not be empty")
    .max(2000, "query must be at most 2000 characters"),
  industry: optionalHint,
  location: z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return value;
      }

      const trimmed = value.trim();

      if (!trimmed || trimmed.toLowerCase() === "unknown") {
        return undefined;
      }

      return trimmed;
    },
    z.string().max(200).optional(),
  ),
  limit: z.number().int().min(1).max(100).optional(),
  excludedWebsites: z.array(z.string().url().max(2048)).max(500).optional(),
});

export const DiscoveredCompanySchema = z.object({
  companyName: z.string().min(1).max(500),
  website: z.string().url().max(2048),
});

export const DiscoveredCompanyListSchema = z.array(DiscoveredCompanySchema);

export const DiscoveredCompanyListResponseSchema = z.object({
  companies: DiscoveredCompanyListSchema,
});

export const DISCOVERED_COMPANY_LIST_JSON_SCHEMA = {
  type: "object",
  properties: {
    companies: {
      type: "array",
      items: {
        type: "object",
        properties: {
          companyName: {
            type: "string",
            description: "Official company or brand name",
          },
          website: {
            type: "string",
            description: "Official company website URL",
          },
        },
        required: ["companyName", "website"],
        additionalProperties: false,
      },
    },
  },
  required: ["companies"],
  additionalProperties: false,
} as const;

export type CompanyDiscoveryInputValidated = z.infer<
  typeof CompanyDiscoveryInputSchema
>;
