import { Filter } from "lucide-react";
import type { ParsedQuery } from "@/types/agents/query-parser.types.js";
import type { SearchResultItemResponse } from "@/types/api/search.api.types.js";
import type { PaginationMeta } from "@/types/api/pagination.api.types.js";
import type { OpenResultDetailOptions } from "@/types/results/result-detail.types.js";
import { ResultCard } from "@/components/results/ResultCard";
import { ResultRow } from "@/components/results/ResultRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";

interface ResultsListProps {
  items: SearchResultItemResponse[];
  pagination: PaginationMeta;
  searchCriteria: ParsedQuery | null;
  selectedIds: Set<string>;
  onSelectChange: (searchResultId: string, selected: boolean) => void;
  onSelectAllOnPage: (selected: boolean) => void;
  onOpenDetail: (result: SearchResultItemResponse, options?: OpenResultDetailOptions) => void;
  onPageChange: (page: number) => void;
}

export function ResultsList({
  items,
  pagination,
  searchCriteria,
  selectedIds,
  onSelectChange,
  onSelectAllOnPage,
  onOpenDetail,
  onPageChange,
}: ResultsListProps) {
  const allSelectedOnPage =
    items.length > 0 && items.every((item) => selectedIds.has(item.searchResultId));
  const someSelectedOnPage = items.some((item) => selectedIds.has(item.searchResultId));

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Filter}
        title="No results match your filters"
        description="Try clearing the company filter or adjusting the pipeline stage."
      />
    );
  }

  return (
    <section aria-labelledby="results-table-heading" className="space-y-4">
      <h2 id="results-table-heading" className="sr-only">
        Search results
      </h2>

      <div className="surface-card px-4 py-3 lg:hidden">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={allSelectedOnPage}
            ref={(element) => {
              if (element) {
                element.indeterminate = !allSelectedOnPage && someSelectedOnPage;
              }
            }}
            aria-label="Select all on page"
            onChange={(event) => onSelectAllOnPage(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          Select all on page
        </label>
      </div>

      <div className="space-y-3 lg:hidden">
        {items.map((result) => (
          <ResultCard
            key={result.searchResultId}
            result={result}
            searchCriteria={searchCriteria}
            selected={selectedIds.has(result.searchResultId)}
            onSelectChange={onSelectChange}
            onOpenDetail={onOpenDetail}
          />
        ))}
      </div>

      <div className="hidden overflow-x-auto surface-card lg:block">
        <table className="w-full min-w-[880px] divide-y divide-slate-200">
          <caption className="sr-only">Search results with company details</caption>
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allSelectedOnPage}
                  ref={(element) => {
                    if (element) {
                      element.indeterminate = !allSelectedOnPage && someSelectedOnPage;
                    }
                  }}
                  aria-label="Select all on page"
                  onChange={(event) => onSelectAllOnPage(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
              </th>
              <TableHeader>Company</TableHeader>
              <TableHeader>Website</TableHeader>
              <TableHeader>Industry</TableHeader>
              <TableHeader>Location</TableHeader>
              <TableHeader>Company size</TableHeader>
              <TableHeader>Decision maker</TableHeader>
            </tr>
          </thead>
          <tbody>
            {items.map((result) => (
              <ResultRow
                key={result.searchResultId}
                result={result}
                searchCriteria={searchCriteria}
                selected={selectedIds.has(result.searchResultId)}
                onSelectChange={onSelectChange}
                onOpenDetail={onOpenDetail}
              />
            ))}
          </tbody>
        </table>
      </div>

      <Pagination pagination={pagination} onPageChange={onPageChange} />
    </section>
  );
}

function TableHeader({ children }: { children: React.ReactNode }) {
  return (
    <th
      scope="col"
      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
    >
      {children}
    </th>
  );
}
