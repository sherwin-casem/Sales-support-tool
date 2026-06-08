"use client";

import Link from "next/link";
import type { SearchResultItemResponse } from "@/types/api/search.api.types";
import { ScoreBadge } from "@/components/results/ScoreBadge";
import { cn } from "@/lib/utils/cn";

interface ResultRowProps {
  result: SearchResultItemResponse;
  className?: string;
}

export function ResultRow({ result, className }: ResultRowProps) {
  const companyLabel = result.company.name ?? result.company.domain;
  const explanation = result.leadScore?.explanation;

  return (
    <tr className={cn("border-b border-slate-100 last:border-b-0", className)}>
      <td className="px-4 py-4 align-top">
        <div className="space-y-1">
          <Link
            href={`/companies/${result.company.id}`}
            className="font-medium text-slate-900 hover:text-brand-600"
          >
            {companyLabel}
          </Link>
          <p className="text-sm text-slate-500">{result.company.domain}</p>
        </div>
      </td>
      <td className="px-4 py-4 align-top">
        <ScoreBadge score={result.leadScore?.score ?? null} />
      </td>
      <td className="px-4 py-4 align-top">
        {explanation ? (
          <p className="text-sm leading-6 text-slate-600">{explanation}</p>
        ) : (
          <p className="text-sm text-slate-400">Score explanation not available yet.</p>
        )}
      </td>
    </tr>
  );
}
