"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CompanyHeader } from "@/components/company/CompanyHeader";
import { CompanyProfilePanel } from "@/components/company/CompanyProfilePanel";
import { CrawlHistoryTimeline } from "@/components/company/CrawlHistoryTimeline";
import { ExtractedInformation } from "@/components/company/ExtractedInformation";
import { useCompanyDetail } from "@/components/company/use-company-detail";

interface CompanyDetailContentProps {
  companyId: string;
}

export function CompanyDetailContent({ companyId }: CompanyDetailContentProps) {
  const { data, error, isLoading, reload } = useCompanyDetail(companyId);

  if (isLoading) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <CompanyDetailSkeleton />
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <Alert title="Unable to load company">{error ?? "Company not found."}</Alert>
        <div className="mt-4 flex gap-3">
          <Button type="button" onClick={() => void reload()}>
            Retry
          </Button>
          <Link href="/search" className="inline-flex items-center text-sm font-medium text-brand-600">
            Back to search
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link
          href="/search"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to search
        </Link>
      </div>

      <div className="space-y-6">
        <CompanyHeader company={data} />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <div className="space-y-6">
            {data.profile ? (
              <>
                <CompanyProfilePanel profile={data.profile} />
                <ExtractedInformation data={data.profile.data} />
              </>
            ) : (
              <Card className="text-center">
                <h2 className="text-lg font-medium text-slate-900">Profile not available</h2>
                <p className="mt-2 text-sm text-slate-600">
                  This company has been discovered but extraction is still pending or failed.
                </p>
              </Card>
            )}

            <CrawlHistoryTimeline company={data} />
          </div>

          <aside className="space-y-6">
            <RecentSearchesPanel company={data} />
          </aside>
        </div>
      </div>
    </main>
  );
}

function RecentSearchesPanel({
  company,
}: {
  company: NonNullable<ReturnType<typeof useCompanyDetail>["data"]>;
}) {
  if (company.recentSearches.length === 0) {
    return null;
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-900">Recent searches</h2>
      <ul className="mt-4 space-y-3">
        {company.recentSearches.map((appearance) => (
          <li key={appearance.searchResultId} className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-100">
            <Link
              href={`/search/${appearance.searchJobId}`}
              className="text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              {appearance.query}
            </Link>
            <p className="mt-1 text-xs text-slate-500">{appearance.stage.replaceAll("_", " ")}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function CompanyDetailSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-2/3 rounded-lg bg-slate-200" />
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-16 rounded-xl bg-slate-200" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="h-80 rounded-2xl bg-slate-200" />
        <div className="h-80 rounded-2xl bg-slate-200" />
      </div>
    </div>
  );
}
