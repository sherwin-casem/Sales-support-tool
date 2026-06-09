"use client";

import Link from "next/link";
import type { SearchResultItemResponse } from "@/types/api/search.api.types";

interface ResultCardProps {
  result: SearchResultItemResponse;
}

export function ResultCard({ result }: ResultCardProps) {
  const companyLabel = result.company.name ?? result.company.domain;
  const summary =
    result.profile?.description ??
    (result.profile?.industry ? `${result.profile.industry} company` : null);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="min-w-0 space-y-1">
        <Link
          href={`/companies/${result.company.id}`}
          className="block truncate font-medium text-slate-900 hover:text-brand-600"
        >
          {companyLabel}
        </Link>
        <p className="truncate text-sm text-slate-500">{result.company.domain}</p>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        {summary ?? "Profile details not available yet."}
      </p>
    </article>
  );
}
