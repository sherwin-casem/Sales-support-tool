"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiClientError } from "@/lib/api/api-client-error";
import { createSearchRequest } from "@/lib/api/browser-client";
import {
  mapSearchFormFieldErrors,
  SearchFormSchema,
  type SearchFormValues,
} from "@/lib/validations/search-form.schema";

export interface UseCreateSearchState {
  isSubmitting: boolean;
  fieldErrors: Partial<Record<keyof SearchFormValues, string>>;
  formError: string | null;
}

export function useCreateSearch() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof SearchFormValues, string>>
  >({});
  const [formError, setFormError] = useState<string | null>(null);

  const submit = useCallback(
    async (values: SearchFormValues) => {
      setFormError(null);
      setFieldErrors({});

      const parsed = SearchFormSchema.safeParse(values);

      if (!parsed.success) {
        setFieldErrors(mapSearchFormFieldErrors(parsed.error));
        return false;
      }

      setIsSubmitting(true);

      try {
        const result = await createSearchRequest(parsed.data);
        router.push(`/search/${result.id}`);
        return true;
      } catch (error) {
        if (error instanceof ApiClientError) {
          const queryError = error.getFieldError("query");
          const limitError = error.getFieldError("companyLimit");

          if (queryError || limitError) {
            setFieldErrors({
              ...(queryError ? { query: queryError } : {}),
              ...(limitError ? { companyLimit: limitError } : {}),
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
