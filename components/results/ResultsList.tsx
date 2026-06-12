import type { ParsedQuery } from "@/types/agents/query-parser.types.js";
import type { SearchResultItemResponse } from "@/types/api/search.api.types.js";
import type { PaginationMeta } from "@/types/api/pagination.api.types.js";
import type { OpenResultDetailOptions } from "@/types/results/result-detail.types.js";
import { ResultRow } from "@/components/results/ResultRow";
import { Pagination } from "@/components/ui/Pagination";

interface ResultsListProps {
  items: SearchResultItemResponse[];
  pagination: PaginationMeta;
  searchCriteria: ParsedQuery | null;
  isSaved: (companyId: string) => boolean;
  selectedIds: Set<string>;
  onSelectChange: (searchResultId: string, selected: boolean) => void;
  onSelectAllOnPage: (selected: boolean) => void;
  onOpenDetail: (result: SearchResultItemResponse, options?: OpenResultDetailOptions) => void;
  onToggleSave: (companyId: string) => void;
  onPageChange: (page: number) => void;
}

export function ResultsList({
  items,
  pagination,
  searchCriteria,
  isSaved,
  selectedIds,
  onSelectChange,
  onSelectAllOnPage,
  onOpenDetail,
  onToggleSave,
  onPageChange,
}: ResultsListProps) {
  const allSelectedOnPage = items.length > 0 && items.every((item) => selectedIds.has(item.searchResultId));
  const someSelectedOnPage = items.some((item) => selectedIds.has(item.searchResultId));
  if (items.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
        <h2 className="text-lg font-medium text-slate-900">No results match your filters</h2>
        <p className="mt-2 text-sm text-slate-600">
          Try clearing the company filter or adjusting the pipeline stage.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="results-table-heading" className="space-y-4">
      <h2 id="results-table-heading" className="sr-only">
        Search results
      </h2>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[960px] w-full divide-y divide-slate-200">
          <caption className="sr-only">
            Search results with company details and save actions
          </caption>
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
              <TableHeader>Save</TableHeader>
            </tr>
          </thead>
          <tbody>
            {items.map((result) => (
              <ResultRow
                key={result.searchResultId}
                result={result}
                searchCriteria={searchCriteria}
                isSaved={isSaved(result.company.id)}
                selected={selectedIds.has(result.searchResultId)}
                onSelectChange={onSelectChange}
                onOpenDetail={onOpenDetail}
                onToggleSave={onToggleSave}
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
