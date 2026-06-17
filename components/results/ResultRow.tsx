"use client";

import { memo } from "react";
import type { ParsedQuery } from "@/types/agents/query-parser.types.js";
import type { SearchResultItemResponse } from "@/types/api/search.api.types.js";
import {
  displayValue,
  formatLocation,
  formatWebsiteLabel,
  getCompanyDisplayName,
  isDisplayEmpty,
} from "@/lib/display/display-fields";
import type { OpenResultDetailOptions } from "@/types/results/result-detail.types";
import { cn } from "@/lib/utils/cn";

interface ResultRowProps {
  result: SearchResultItemResponse;
  searchCriteria: ParsedQuery | null;
  selected: boolean;
  onSelectChange: (searchResultId: string, selected: boolean) => void;
  onOpenDetail: (result: SearchResultItemResponse, options?: OpenResultDetailOptions) => void;
  className?: string;
}

export const ResultRow = memo(function ResultRow({
  result,
  searchCriteria,
  selected,
  onSelectChange,
  onOpenDetail,
  className,
}: ResultRowProps) {
  const profile = result.profile;
  const companyLabel = getCompanyDisplayName(
    profile,
    result.company.name,
    result.company.domain,
  );
  const decisionMakerLabel = displayValue(profile?.decisionMaker);
  const hasDecisionMaker = !isDisplayEmpty(profile?.decisionMaker);

  return (
    <tr className={cn("border-b border-slate-100 transition-colors last:border-b-0 hover:bg-slate-50/80", className)}>
      <td className="px-4 py-4 align-top">
        <input
          type="checkbox"
          checked={selected}
          aria-label={`Select ${companyLabel}`}
          onChange={(event) => onSelectChange(result.searchResultId, event.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        />
      </td>
      <td className="px-4 py-4 align-top">
        <button
          type="button"
          onClick={() => onOpenDetail(result)}
          className="text-left font-medium text-slate-900 hover:text-brand-600"
        >
          {companyLabel}
        </button>
      </td>
      <td className="px-4 py-4 align-top">
        {result.company.websiteUrl ? (
          <a
            href={result.company.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            {formatWebsiteLabel(result.company.websiteUrl)}
          </a>
        ) : (
          <span className="text-sm text-slate-400">{displayValue(null)}</span>
        )}
      </td>
      <td className="px-4 py-4 align-top text-sm text-slate-700">
        {displayValue(profile?.industry)}
      </td>
      <td className="px-4 py-4 align-top text-sm text-slate-700">
        {formatLocation(profile, searchCriteria)}
      </td>
      <td className="px-4 py-4 align-top text-sm text-slate-700">
        {displayValue(profile?.estimatedCompanySize)}
      </td>
      <td className="px-4 py-4 align-top text-sm text-slate-700">
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
      </td>
    </tr>
  );
});
