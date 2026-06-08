"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ResultsList } from "@/components/results/ResultsList";
import { ResultsToolbar } from "@/components/results/ResultsToolbar";
import { SearchJobHeader } from "@/components/results/SearchJobHeader";
import { useSearchJob } from "@/components/results/use-search-job";
import { processSearchResults } from "@/lib/results/process-search-results";
import { isSearchJobActive } from "@/lib/results/search-job-status";
import {
  DEFAULT_RESULTS_VIEW,
  ResultsViewSchema,
  type ResultsViewState,
} from "@/lib/validations/results-view.schema";

interface ResultsPageContentProps {
  searchJobId: string;
}

export function ResultsPageContent({ searchJobId }: ResultsPageContentProps) {
  const [view, setView] = useState<ResultsViewState>(DEFAULT_RESULTS_VIEW);

  const apiFilters = useMemo(
    () => ({
      minScore: view.minScore,
      stage: view.stage,
    }),
    [view.minScore, view.stage],
  );

  const { data, error, isLoading, isRefreshing, reload } = useSearchJob(
    searchJobId,
    apiFilters,
  );

  const processed = useMemo(() => {
    if (!data) {
      return null;
    }

    const parsedView = ResultsViewSchema.parse(view);
    return processSearchResults(data.results, parsedView);
  }, [data, view]);

  function updateView(patch: Partial<ResultsViewState>) {
    setView((current) => ResultsViewSchema.parse({ ...current, ...patch }));
  }

  if (isLoading) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <ResultsSkeleton />
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <Alert title="Unable to load results">{error ?? "Search job not found."}</Alert>
        <div className="mt-4 flex gap-3">
          <Button type="button" onClick={() => void reload()}>
            Retry
          </Button>
          <Link href="/search" className="inline-flex items-center text-sm font-medium text-brand-600">
            Start a new search
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link href="/search" className="text-sm font-medium text-brand-600 hover:text-brand-700">
          ← New search
        </Link>
      </div>

      <div className="space-y-6">
        <SearchJobHeader job={data} isRefreshing={isRefreshing} />

        <ResultsToolbar view={view} onChange={updateView} disabled={isRefreshing} />

        {isSearchJobActive(data.status) ? (
          <p className="text-sm text-slate-600" aria-live="polite">
            Search is still running. Results will refresh automatically as companies are scored.
          </p>
        ) : null}

        {processed ? (
          <ResultsList
            items={processed.items}
            pagination={processed.pagination}
            onPageChange={(page) => updateView({ page })}
          />
        ) : null}
      </div>
    </main>
  );
}

function ResultsSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-2/3 rounded-lg bg-slate-200" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-20 rounded-xl bg-slate-200" />
        ))}
      </div>
      <div className="h-40 rounded-2xl bg-slate-200" />
      <div className="h-72 rounded-2xl bg-slate-200" />
    </div>
  );
}
