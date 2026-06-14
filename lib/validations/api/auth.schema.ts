import { z } from "zod";

export const RegisterRequestSchema = z.object({
  orgName: z.string().trim().min(1, "Organization name is required").max(200),
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email("Enter a valid email address").max(320),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export type RegisterRequestInput = z.infer<typeof RegisterRequestSchema>;
