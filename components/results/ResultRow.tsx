"use client";

import type { ParsedQuery } from "@/types/agents/query-parser.types.js";
import type { SearchResultItemResponse } from "@/types/api/search.api.types.js";
import { Button } from "@/components/ui/Button";
import {
  displayValue,
  formatLocation,
  formatWebsiteLabel,
  getCompanyDisplayName,
} from "@/lib/results/display-fields";
import { cn } from "@/lib/utils/cn";

interface ResultRowProps {
  result: SearchResultItemResponse;
  searchCriteria: ParsedQuery | null;
  isSaved: boolean;
  onOpenDetail: (result: SearchResultItemResponse) => void;
  onToggleSave: (companyId: string) => void;
  className?: string;
}

export function ResultRow({
  result,
  searchCriteria,
  isSaved,
  onOpenDetail,
  onToggleSave,
  className,
}: ResultRowProps) {
  const profile = result.profile;
  const companyLabel = getCompanyDisplayName(
    profile,
    result.company.name,
    result.company.domain,
  );

  return (
    <tr className={cn("border-b border-slate-100 last:border-b-0", className)}>
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
        {displayValue(profile?.decisionMaker)}
      </td>
      <td className="px-4 py-4 align-top">
        <Button
          type="button"
          variant={isSaved ? "primary" : "secondary"}
          className="px-3 py-1.5 text-xs"
          onClick={() => onToggleSave(result.company.id)}
          aria-pressed={isSaved}
        >
          {isSaved ? "Saved" : "Save"}
        </Button>
      </td>
    </tr>
  );
}
