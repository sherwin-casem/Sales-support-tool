"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  COMPANY_LIMIT_OPTIONS,
  EXAMPLE_QUERIES,
} from "@/lib/validations/search-form.schema";
import { ExampleQueryChips } from "@/components/search/ExampleQueryChips";
import { useCreateSearch } from "@/components/search/use-create-search";

export function SearchForm() {
  const queryFieldId = useId();
  const limitFieldId = useId();
  const [query, setQuery] = useState("");
  const [companyLimit, setCompanyLimit] = useState<string>("");
  const { submit, isSubmitting, fieldErrors, formError } = useCreateSearch();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submit({
      query,
      companyLimit: companyLimit === "" ? null : Number(companyLimit),
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-6"
      aria-labelledby="search-form-heading"
    >
      <div className="sr-only" id="search-form-heading">
        Start a company search
      </div>

      {formError ? (
        <Alert title="Search failed">{formError}</Alert>
      ) : null}

      <Textarea
        id={queryFieldId}
        name="query"
        label="Search query"
        hint="Describe industry, location, company size, or other criteria in plain language."
        placeholder="e.g. logistics companies in Finland with 50–200 employees"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        error={fieldErrors.query}
        required
        maxLength={500}
        disabled={isSubmitting}
      />

      <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_200px] sm:items-end">
        <ExampleQueryChips
          examples={EXAMPLE_QUERIES}
          disabled={isSubmitting}
          onSelect={setQuery}
        />

        <Select
          id={limitFieldId}
          name="companyLimit"
          label="Target leads"
          hint="Keep discovering until this many enriched leads appear in results."
          value={companyLimit}
          onChange={(event) => setCompanyLimit(event.target.value)}
          error={fieldErrors.companyLimit}
          disabled={isSubmitting}
        >
          <option value="">No limit</option>
          {COMPANY_LIMIT_OPTIONS.map((limit) => (
            <option key={limit} value={limit}>
              {limit} leads
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          {query.trim().length}/500 characters
        </p>

        <Button type="submit" isLoading={isSubmitting} className="sm:min-w-40">
          {isSubmitting ? "Starting search…" : "Start search"}
        </Button>
      </div>
    </form>
  );
}
