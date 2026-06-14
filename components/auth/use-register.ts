"use client";

import { useCallback, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ApiClientError } from "@/lib/api/api-client-error";
import { registerRequest } from "@/lib/api/browser-client";
import {
  mapRegisterFormFieldErrors,
  RegisterFormSchema,
  type RegisterFormValues,
} from "@/lib/validations/register-form.schema";

export function useRegister() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof RegisterFormValues, string>>
  >({});
  const [formError, setFormError] = useState<string | null>(null);

  const submit = useCallback(
    async (values: RegisterFormValues) => {
      setFormError(null);
      setFieldErrors({});

      const parsed = RegisterFormSchema.safeParse(values);

      if (!parsed.success) {
        setFieldErrors(mapRegisterFormFieldErrors(parsed.error));
        return false;
      }

      setIsSubmitting(true);

      try {
        await registerRequest({
          orgName: parsed.data.orgName,
          name: parsed.data.name,
          email: parsed.data.email,
          password: parsed.data.password,
        });

        const signInResult = await signIn("credentials", {
          email: parsed.data.email,
          password: parsed.data.password,
          redirect: false,
        });

        if (signInResult?.error) {
          setFormError("Account created, but sign-in failed. Please sign in manually.");
          return false;
        }

        router.push("/search");
        router.refresh();
        return true;
      } catch (error) {
        if (error instanceof ApiClientError) {
          const emailError = error.getFieldError("email");
          const orgNameError = error.getFieldError("orgName");
          const nameError = error.getFieldError("name");
          const passwordError = error.getFieldError("password");

          if (emailError || orgNameError || nameError || passwordError) {
            setFieldErrors({
              ...(emailError ? { email: emailError } : {}),
              ...(orgNameError ? { orgName: orgNameError } : {}),
              ...(nameError ? { name: nameError } : {}),
              ...(passwordError ? { password: passwordError } : {}),
            });
          } else {
            setFormError(error.message);
          }
        } else {
          setFormError("Something went wrong. Please try again.");
        }

        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [router],
  );

  return {
    submit,
    isSubmitting,
    fieldErrors,
    formError,
  };
}
