"use client";

import { useId } from "react";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { ResultsViewState } from "@/lib/validations/results-view.schema";

interface ResultsToolbarProps {
  view: ResultsViewState;
  onChange: (patch: Partial<ResultsViewState>) => void;
  disabled?: boolean;
  showSaveResults?: boolean;
  isSaved?: boolean;
  onSaveResults?: () => void;
  savePending?: boolean;
}

export function ResultsToolbar({
  view,
  onChange,
  disabled = false,
  showSaveResults = false,
  isSaved = false,
  onSaveResults,
  savePending = false,
}: ResultsToolbarProps) {
  const companyFilterId = useId();

  return (
    <Card padding="md">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex-1">
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
        </div>
        {showSaveResults ? (
          <Button
            type="button"
            variant={isSaved ? "primary" : "secondary"}
            isLoading={savePending}
            disabled={isSaved}
            onClick={onSaveResults}
          >
            {isSaved ? "Saved" : "Save results"}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
