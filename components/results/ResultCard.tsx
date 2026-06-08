"use client";

import Link from "next/link";
import type { SearchResultItemResponse } from "@/types/api/search.api.types";
import { ScoreBadge } from "@/components/results/ScoreBadge";

interface ResultCardProps {
  result: SearchResultItemResponse;
}

export function ResultCard({ result }: ResultCardProps) {
  const companyLabel = result.company.name ?? result.company.domain;
  const explanation = result.leadScore?.explanation;

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <Link
            href={`/companies/${result.company.id}`}
            className="block truncate font-medium text-slate-900 hover:text-brand-600"
          >
            {companyLabel}
          </Link>
          <p className="truncate text-sm text-slate-500">{result.company.domain}</p>
        </div>
        <ScoreBadge score={result.leadScore?.score ?? null} />
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        {explanation ?? "Score explanation not available yet."}
      </p>
    </article>
  );
}
