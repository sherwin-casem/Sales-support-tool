import type { GetSearchResponse } from "@/types/api/search.api.types";
import { formatSearchJobStatus } from "@/lib/results/search-job-status";
import { isUnlimitedCompanyLimit } from "@/lib/search/company-limit";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";

interface SearchJobHeaderProps {
  job: GetSearchResponse;
  isRefreshing: boolean;
}

function statusVariant(status: GetSearchResponse["status"]): "default" | "success" | "warning" | "info" | "error" {
  switch (status) {
    case "COMPLETED":
      return "success";
    case "FAILED":
      return "error";
    case "CANCELLED":
      return "warning";
    case "PENDING":
      return "default";
    default:
      return "info";
  }
}

function buildJobDescription(job: GetSearchResponse): string {
  if (!isUnlimitedCompanyLimit(job.companyLimit)) {
    return `${job.summary.enriched} / ${job.companyLimit} leads enriched`;
  }

  return `${job.summary.discovered} companies discovered`;
}

export function SearchJobHeader({ job, isRefreshing }: SearchJobHeaderProps) {
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Search results"
        title={job.query}
        description={buildJobDescription(job)}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant(job.status)}>
              {formatSearchJobStatus(job.status)}
            </Badge>
            {isRefreshing ? (
              <span className="text-sm text-slate-500" aria-live="polite">
                Updating…
              </span>
            ) : null}
          </div>
        }
      />

      {job.errorMessage ? (
        <Alert variant="warning" title="Search issue">
          {job.errorMessage}
        </Alert>
      ) : null}
    </div>
  );
}
