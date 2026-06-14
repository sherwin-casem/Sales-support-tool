import { z } from "zod";

export const RegisterFormSchema = z
  .object({
    orgName: z.string().trim().min(1, "Organization name is required").max(200),
    name: z.string().trim().min(1, "Name is required").max(200),
    email: z.string().trim().email("Enter a valid email address").max(320),
    password: z.string().min(8, "Password must be at least 8 characters").max(128),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterFormValues = z.infer<typeof RegisterFormSchema>;

export function mapRegisterFormFieldErrors(
  error: z.ZodError,
): Partial<Record<keyof RegisterFormValues, string>> {
  const fieldErrors: Partial<Record<keyof RegisterFormValues, string>> = {};

  for (const issue of error.issues) {
    const field = issue.path[0];

    if (
      field === "orgName" ||
      field === "name" ||
      field === "email" ||
      field === "password" ||
      field === "confirmPassword"
    ) {
      if (!fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
  }

  return fieldErrors;
}
