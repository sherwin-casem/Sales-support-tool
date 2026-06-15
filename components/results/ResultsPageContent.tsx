"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { CampaignCreateModal } from "@/components/outreach/CampaignCreateModal";
import { ResultsList } from "@/components/results/ResultsList";
import { ResultsToolbar } from "@/components/results/ResultsToolbar";
import { SearchJobHeader } from "@/components/results/SearchJobHeader";
import { useSavedCompanies } from "@/components/results/use-saved-companies";
import { useSearchJob } from "@/components/results/use-search-job";
import { processSearchResults } from "@/lib/results/process-search-results";
import {
  DEFAULT_RESULTS_VIEW,
  ResultsViewSchema,
  type ResultsViewState,
} from "@/lib/validations/results-view.schema";
import type { SearchResultItemResponse } from "@/types/api/search.api.types";
import type {
  OpenResultDetailOptions,
  ResultDetailFocus,
} from "@/types/results/result-detail.types";

// Lazy-loaded: the drawer (and its large contact-validation dependency) is only
// fetched when a result is opened, keeping it out of the initial bundle.
const CompanyDetailDrawer = dynamic(
  () =>
    import("@/components/results/CompanyDetailDrawer.js").then(
      (mod) => mod.CompanyDetailDrawer,
    ),
  { ssr: false },
);

interface ResultsPageContentProps {
  searchJobId: string;
}

export function ResultsPageContent({ searchJobId }: ResultsPageContentProps) {
  const router = useRouter();
  const [view, setView] = useState<ResultsViewState>(DEFAULT_RESULTS_VIEW);
  const [selectedResult, setSelectedResult] = useState<SearchResultItemResponse | null>(null);
  const [detailFocus, setDetailFocus] = useState<ResultDetailFocus>("overview");
  const [selectedSearchResultIds, setSelectedSearchResultIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);

  const handleOpenDetail = useCallback(
    (result: SearchResultItemResponse, options?: OpenResultDetailOptions) => {
      setSelectedResult(result);
      setDetailFocus(options?.focus ?? "overview");
    },
    [],
  );

  const handleCloseDetail = useCallback(() => {
    setSelectedResult(null);
    setDetailFocus("overview");
  }, []);

  const { isSaved, toggleSave } = useSavedCompanies();

  const apiFilters = useMemo(
    () => ({
      stage: view.stage,
    }),
    [view.stage],
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

  const updateView = useCallback((patch: Partial<ResultsViewState>) => {
    setView((current) => ResultsViewSchema.parse({ ...current, ...patch }));
  }, []);

  const handlePageChange = useCallback(
    (page: number) => updateView({ page }),
    [updateView],
  );

  const handleSelectChange = useCallback((searchResultId: string, selected: boolean) => {
    setSelectedSearchResultIds((current) => {
      const next = new Set(current);

      if (selected) {
        next.add(searchResultId);
      } else {
        next.delete(searchResultId);
      }

      return next;
    });
  }, []);

  const handleSelectAllOnPage = useCallback(
    (selected: boolean) => {
      if (!processed) {
        return;
      }

      setSelectedSearchResultIds((current) => {
        const next = new Set(current);

        for (const item of processed.items) {
          if (selected) {
            next.add(item.searchResultId);
          } else {
            next.delete(item.searchResultId);
          }
        }

        return next;
      });
    },
    [processed],
  );

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/search");
  }

  if (isLoading) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <ResultsSkeleton />
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <Alert title="Unable to load results">{error ?? "Search job not found."}</Alert>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Button type="button" onClick={() => void reload()}>
            Retry
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.push("/search")}>
            Back to search
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div className="mb-4 sm:mb-6">
        <Button type="button" variant="ghost" className="px-0" onClick={handleBack}>
          ← Back
        </Button>
      </div>

      <div className="space-y-4 sm:space-y-6">
        <SearchJobHeader job={data} isRefreshing={isRefreshing} />

        <ResultsToolbar view={view} onChange={updateView} />

        {selectedSearchResultIds.size > 0 ? (
          <section className="flex flex-col gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-brand-900">
              {selectedSearchResultIds.size} lead{selectedSearchResultIds.size === 1 ? "" : "s"} selected
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSelectedSearchResultIds(new Set())}
              >
                Clear selection
              </Button>
              <Button type="button" onClick={() => setCampaignModalOpen(true)}>
                Create campaign from selected
              </Button>
            </div>
          </section>
        ) : null}

        {processed ? (
          <ResultsList
            items={processed.items}
            pagination={processed.pagination}
            searchCriteria={data.criteria}
            isSaved={isSaved}
            selectedIds={selectedSearchResultIds}
            onSelectChange={handleSelectChange}
            onSelectAllOnPage={handleSelectAllOnPage}
            onOpenDetail={handleOpenDetail}
            onToggleSave={toggleSave}
            onPageChange={handlePageChange}
          />
        ) : null}
      </div>

      {selectedResult ? (
        <CompanyDetailDrawer
          result={selectedResult}
          searchCriteria={data.criteria}
          open
          focusSection={detailFocus}
          onClose={handleCloseDetail}
        />
      ) : null}

      <CampaignCreateModal
        open={campaignModalOpen}
        searchResultIds={[...selectedSearchResultIds]}
        onClose={() => setCampaignModalOpen(false)}
        onCampaignCreated={(campaignId) => router.push(`/campaigns/${campaignId}`)}
      />
    </main>
  );
}

function ResultsSkeleton() {
  return (
    <div className="animate-pulse space-y-4 sm:space-y-6">
      <div className="h-8 w-2/3 rounded-lg bg-slate-200" />
      <div className="h-20 rounded-2xl bg-slate-200 sm:h-24" />
      <div className="space-y-3 lg:hidden">
        <div className="h-44 rounded-2xl bg-slate-200" />
        <div className="h-44 rounded-2xl bg-slate-200" />
      </div>
      <div className="hidden h-72 rounded-2xl bg-slate-200 lg:block" />
    </div>
  );
}
