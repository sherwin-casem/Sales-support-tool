"use client";

import { useId } from "react";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import type { ResultsViewState } from "@/lib/validations/results-view.schema";

interface ResultsToolbarProps {
  view: ResultsViewState;
  onChange: (patch: Partial<ResultsViewState>) => void;
  disabled?: boolean;
}

export function ResultsToolbar({ view, onChange, disabled = false }: ResultsToolbarProps) {
  const companyFilterId = useId();

  return (
    <Card padding="md">
      <Input
        id={companyFilterId}
        label="Company filter"
        placeholder="Filter by name or domain"
        value={view.companyQuery ?? ""}
        disabled={disabled}
        onChange={(event) =>
          onChange({
            companyQuery: event.target.value,
            page: 1,
          })
        }
      />
    </Card>
  );
}
