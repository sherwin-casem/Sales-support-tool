import type { ParsedQuery } from "@/types/agents/query-parser.types.js";
import type { SearchResultItemResponse } from "@/types/api/search.api.types.js";
import type { PaginationMeta } from "@/types/api/pagination.api.types.js";
import { ResultRow } from "@/components/results/ResultRow";
import { Pagination } from "@/components/ui/Pagination";

interface ResultsListProps {
  items: SearchResultItemResponse[];
  pagination: PaginationMeta;
  searchCriteria: ParsedQuery | null;
  isSaved: (companyId: string) => boolean;
  onOpenDetail: (result: SearchResultItemResponse) => void;
  onToggleSave: (companyId: string) => void;
  onPageChange: (page: number) => void;
}

export function ResultsList({
  items,
  pagination,
  searchCriteria,
  isSaved,
  onOpenDetail,
  onToggleSave,
  onPageChange,
}: ResultsListProps) {
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
