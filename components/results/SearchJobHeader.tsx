import type { GetSearchResponse } from "@/types/api/search.api.types";
import { formatSearchJobStatus } from "@/lib/results/search-job-status";
import { cn } from "@/lib/utils/cn";

interface SearchJobHeaderProps {
  job: GetSearchResponse;
  isRefreshing: boolean;
}

const statusStyles: Record<GetSearchResponse["status"], string> = {
  PENDING: "bg-slate-100 text-slate-700",
  DISCOVERING: "bg-blue-50 text-blue-700",
  CRAWLING: "bg-blue-50 text-blue-700",
  EXTRACTING: "bg-blue-50 text-blue-700",
  ENRICHING: "bg-blue-50 text-blue-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  FAILED: "bg-rose-50 text-rose-700",
  CANCELLED: "bg-slate-100 text-slate-600",
};

export function SearchJobHeader({ job, isRefreshing }: SearchJobHeaderProps) {
  return (
    <header className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-wide text-brand-600">
            Search results
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {job.query}
          </h1>
          <p className="text-sm text-slate-600">
            {job.summary.discovered} companies discovered
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex rounded-full px-3 py-1 text-sm font-medium",
              statusStyles[job.status],
            )}
          >
            {formatSearchJobStatus(job.status)}
          </span>
          {isRefreshing ? (
            <span className="text-sm text-slate-500" aria-live="polite">
              Updating…
            </span>
          ) : null}
        </div>
      </div>

      {job.errorMessage ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {job.errorMessage}
        </p>
      ) : null}
    </header>
  );
}
