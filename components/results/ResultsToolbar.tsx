"use client";

import { useId } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  RESULTS_PAGE_SIZE_OPTIONS,
  RESULTS_SORT_OPTIONS,
  SEARCH_RESULT_STAGES,
  type ResultsViewState,
} from "@/lib/validations/results-view.schema";

interface ResultsToolbarProps {
  view: ResultsViewState;
  onChange: (patch: Partial<ResultsViewState>) => void;
  disabled?: boolean;
}

const sortLabels: Record<(typeof RESULTS_SORT_OPTIONS)[number], string> = {
  score_desc: "Score: high to low",
  score_asc: "Score: low to high",
  company_asc: "Company: A to Z",
  company_desc: "Company: Z to A",
  rank_asc: "Discovery rank",
};

export function ResultsToolbar({ view, onChange, disabled = false }: ResultsToolbarProps) {
  const companyFilterId = useId();
  const minScoreId = useId();
  const stageId = useId();
  const sortId = useId();
  const pageSizeId = useId();

  return (
    <section
      aria-label="Filter and sort results"
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
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

        <Input
          id={minScoreId}
          label="Minimum score"
          type="number"
          min={0}
          max={100}
          placeholder="Any score"
          value={view.minScore ?? ""}
          disabled={disabled}
          onChange={(event) => {
            const value = event.target.value.trim();

            onChange({
              minScore: value === "" ? undefined : Number(value),
              page: 1,
            });
          }}
        />

        <Select
          id={stageId}
          label="Pipeline stage"
          value={view.stage ?? ""}
          disabled={disabled}
          onChange={(event) =>
            onChange({
              stage: event.target.value
                ? (event.target.value as ResultsViewState["stage"])
                : undefined,
              page: 1,
            })
          }
        >
          <option value="">All stages</option>
          {SEARCH_RESULT_STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {stage.replaceAll("_", " ")}
            </option>
          ))}
        </Select>

        <Select
          id={sortId}
          label="Sort by"
          value={view.sort}
          disabled={disabled}
          onChange={(event) =>
            onChange({
              sort: event.target.value as ResultsViewState["sort"],
              page: 1,
            })
          }
        >
          {RESULTS_SORT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {sortLabels[option]}
            </option>
          ))}
        </Select>

        <Select
          id={pageSizeId}
          label="Results per page"
          value={view.pageSize}
          disabled={disabled}
          onChange={(event) =>
            onChange({
              pageSize: Number(event.target.value),
              page: 1,
            })
          }
        >
          {RESULTS_PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size} per page
            </option>
          ))}
        </Select>
      </div>
    </section>
  );
}
