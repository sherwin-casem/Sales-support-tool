import type { GetSearchResponse } from "@/types/api/search.api.types";
import { PageHeader } from "@/components/ui/PageHeader";

interface SearchJobHeaderProps {
  job: GetSearchResponse;
  isRefreshing: boolean;
}

export function SearchJobHeader({ job, isRefreshing }: SearchJobHeaderProps) {
  return (
    <PageHeader
      eyebrow="Search results"
      title={job.query}
      actions={
        isRefreshing ? (
          <span className="text-sm text-slate-500" aria-live="polite">
            Updating…
          </span>
        ) : null
      }
    />
  );
}
