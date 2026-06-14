import { describe, expect, it } from "vitest";
import { RegisterFormSchema } from "@/lib/validations/register-form.schema.js";

describe("RegisterFormSchema", () => {
  it("accepts valid registration values", () => {
    const parsed = RegisterFormSchema.safeParse({
      orgName: "Acme Corp",
      name: "Jane Doe",
      email: "jane@acme.com",
      password: "password123",
      confirmPassword: "password123",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    const parsed = RegisterFormSchema.safeParse({
      orgName: "Acme Corp",
      name: "Jane Doe",
      email: "jane@acme.com",
      password: "password123",
      confirmPassword: "different",
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.path[0] === "confirmPassword")).toBe(
        true,
      );
    }
  });

  it("rejects short passwords", () => {
    const parsed = RegisterFormSchema.safeParse({
      orgName: "Acme Corp",
      name: "Jane Doe",
      email: "jane@acme.com",
      password: "short",
      confirmPassword: "short",
    });

    expect(parsed.success).toBe(false);
  });
});
