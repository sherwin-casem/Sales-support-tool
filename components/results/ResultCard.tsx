"use client";

import Link from "next/link";
import type { SearchResultItemResponse } from "@/types/api/search.api.types";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

interface ResultCardProps {
  result: SearchResultItemResponse;
}

export function ResultCard({ result }: ResultCardProps) {
  const companyLabel = result.company.name ?? result.company.domain;
  const summary =
    result.profile?.description ??
    (result.profile?.industry ? `${result.profile.industry} company` : null);

  return (
    <Card hover padding="md" className="h-full">
      <div className="min-w-0 space-y-2">
        <Link
          href={`/companies/${result.company.id}`}
          className="block truncate text-base font-semibold text-slate-900 hover:text-brand-600"
        >
          {companyLabel}
        </Link>
        <p className="truncate text-sm text-slate-500">{result.company.domain}</p>
        {result.profile?.industry ? (
          <Badge variant="brand">{result.profile.industry}</Badge>
        ) : null}
      </div>

      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
        {summary ?? "Profile details not available yet."}
      </p>
    </Card>
  );
}
