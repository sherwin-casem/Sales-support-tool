import { z } from "zod";

export const SearchFormSchema = z.object({
  query: z
    .string()
    .trim()
    .min(1, "Describe the companies you are looking for")
    .max(500, "Query must be 500 characters or fewer"),
  companyLimit: z
    .preprocess(
      (value) => {
        if (value === "" || value === null || value === undefined) {
          return null;
        }

        return value;
      },
      z.union([
        z.null(),
        z.coerce
          .number()
          .int("Company limit must be a whole number")
          .min(1, "Company limit must be at least 1")
          .max(100, "Company limit cannot exceed 100"),
      ]),
    )
    .default(null),
});

export type SearchFormValues = z.infer<typeof SearchFormSchema>;

export const COMPANY_LIMIT_OPTIONS = [10, 25, 50, 100] as const;

export const EXAMPLE_QUERIES = [
  "Logistics companies in Finland with 50-200 employees",
  "B2B SaaS startups in the Nordics",
  "Manufacturing companies in Germany focused on automation",
] as const;

export function mapSearchFormFieldErrors(
  error: z.ZodError,
): Partial<Record<keyof SearchFormValues, string>> {
  const fieldErrors: Partial<Record<keyof SearchFormValues, string>> = {};

  for (const issue of error.issues) {
    const field = issue.path[0];

    if (
      (field === "query" || field === "companyLimit") &&
      !fieldErrors[field]
    ) {
      fieldErrors[field] = issue.message;
    }
  }

  return fieldErrors;
}
