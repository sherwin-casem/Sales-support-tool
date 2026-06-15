"use client";

import { Button } from "@/components/ui/Button";
import { formatSearchJobStatus } from "@/lib/results/search-job-status";
import type { GetSearchResponse } from "@/types/api/search.api.types";

interface SearchJobControlsProps {
  job: GetSearchResponse;
  isPending: boolean;
  onStop: () => void;
}

export function SearchJobControls({ job, isPending, onStop }: SearchJobControlsProps) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-slate-900">Search in progress</p>
        <p className="text-sm text-slate-600">
          Status: {formatSearchJobStatus(job.status)}
          {" · "}
          {job.summary.enriched} enriched
          {job.companyLimit !== null ? ` of ${job.companyLimit}` : ""}
        </p>
      </div>

      <Button type="button" variant="destructive" isLoading={isPending} onClick={onStop}>
        Stop
      </Button>
    </section>
  );
}
