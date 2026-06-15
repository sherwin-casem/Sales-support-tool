"use client";

import { memo } from "react";
import type { ParsedQuery } from "@/types/agents/query-parser.types.js";
import type { SearchResultItemResponse } from "@/types/api/search.api.types.js";
import { Card } from "@/components/ui/Card";
import {
  displayValue,
  formatLocation,
  formatWebsiteLabel,
  getCompanyDisplayName,
  isDisplayEmpty,
} from "@/lib/results/display-fields";
import type { OpenResultDetailOptions } from "@/types/results/result-detail.types";
import { cn } from "@/lib/utils/cn";

interface ResultCardProps {
  result: SearchResultItemResponse;
  searchCriteria: ParsedQuery | null;
  selected: boolean;
  onSelectChange: (searchResultId: string, selected: boolean) => void;
  onOpenDetail: (result: SearchResultItemResponse, options?: OpenResultDetailOptions) => void;
  className?: string;
}

export const ResultCard = memo(function ResultCard({
  result,
  searchCriteria,
  selected,
  onSelectChange,
  onOpenDetail,
  className,
}: ResultCardProps) {
  const profile = result.profile;
  const companyLabel = getCompanyDisplayName(
    profile,
    result.company.name,
    result.company.domain,
  );
  const decisionMakerLabel = displayValue(profile?.decisionMaker);
  const hasDecisionMaker = !isDisplayEmpty(profile?.decisionMaker);

  return (
    <Card padding="md" className={cn("transition-shadow", className)}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          aria-label={`Select ${companyLabel}`}
          onChange={(event) => onSelectChange(result.searchResultId, event.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        />

        <div className="min-w-0 flex-1 space-y-3">
          <button
            type="button"
            onClick={() => onOpenDetail(result)}
            className="text-left text-base font-semibold text-slate-900 hover:text-brand-600"
          >
            {companyLabel}
          </button>

          <dl className="grid gap-2 text-sm">
            <CardField label="Website">
              {result.company.websiteUrl ? (
                <a
                  href={result.company.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-brand-600 hover:text-brand-700"
                >
                  {formatWebsiteLabel(result.company.websiteUrl)}
                </a>
              ) : (
                <span className="text-slate-400">{displayValue(null)}</span>
              )}
            </CardField>
            <CardField label="Industry">{displayValue(profile?.industry)}</CardField>
            <CardField label="Location">{formatLocation(profile, searchCriteria)}</CardField>
            <CardField label="Company size">{displayValue(profile?.estimatedCompanySize)}</CardField>
            <CardField label="Decision maker">
              {hasDecisionMaker ? (
                <button
                  type="button"
                  onClick={() => onOpenDetail(result, { focus: "decisionMaker" })}
                  className="text-left font-medium text-brand-600 hover:text-brand-700 hover:underline"
                  title="View decision maker contact details"
                >
                  {decisionMakerLabel}
                </button>
              ) : (
                <span className="text-slate-400">{decisionMakerLabel}</span>
              )}
            </CardField>
          </dl>
        </div>
      </div>
    </Card>
  );
});

function CardField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] items-start gap-2">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="min-w-0 text-slate-700">{children}</dd>
    </div>
  );
}
