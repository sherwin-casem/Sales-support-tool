import Link from "next/link";
import type { CompanyLeadScoreResponse } from "@/types/api/company.api.types";
import type { ScoreBreakdown } from "@/types/agents/lead-scoring.types";
import { ScoreBadge } from "@/components/results/ScoreBadge";
import { formatDateTime, formatPercent } from "@/lib/utils/format-display";

interface LeadScorePanelProps {
  leadScore: CompanyLeadScoreResponse;
}

const factorLabels: Record<keyof ScoreBreakdown, string> = {
  industryFit: "Industry fit",
  sizeFit: "Size fit",
  businessMaturity: "Business maturity",
  growthIndicators: "Growth indicators",
};

export function LeadScorePanel({ leadScore }: LeadScorePanelProps) {
  return (
    <section
      aria-labelledby="lead-score-heading"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="lead-score-heading" className="text-lg font-semibold text-slate-900">
            Lead score
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            From search:{" "}
            <Link
              href={`/search/${leadScore.searchJobId}`}
              className="font-medium text-brand-600 hover:text-brand-700"
            >
              {leadScore.query}
            </Link>
          </p>
        </div>
        <ScoreBadge score={leadScore.score} className="text-sm" />
      </div>

      <p className="mt-4 text-sm text-slate-600">
        Confidence {formatPercent(leadScore.confidence * 100)} · scored{" "}
        {formatDateTime(leadScore.scoredAt)}
      </p>

      <div className="mt-6 space-y-4">
        {(Object.keys(factorLabels) as Array<keyof ScoreBreakdown>).map((factor) => {
          const entry = leadScore.breakdown[factor];

          return (
            <div key={factor}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">{factorLabels[factor]}</span>
                <span className="text-slate-600">{Math.round(entry.score)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-brand-600"
                  style={{ width: `${Math.min(100, Math.max(0, entry.score))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-xl bg-slate-50 p-4">
        <h3 className="text-sm font-medium text-slate-900">Explanation</h3>
        <p className="mt-2 text-sm leading-6 text-slate-700">{leadScore.explanation}</p>
      </div>
    </section>
  );
}
