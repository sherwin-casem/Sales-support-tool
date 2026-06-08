import type { SearchResultItemResponse } from "@/types/api/search.api.types";
import type { PaginationMeta } from "@/types/api/pagination.api.types";
import { ResultCard } from "@/components/results/ResultCard";
import { ResultRow } from "@/components/results/ResultRow";
import { Pagination } from "@/components/ui/Pagination";

interface ResultsListProps {
  items: SearchResultItemResponse[];
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
}

export function ResultsList({ items, pagination, onPageChange }: ResultsListProps) {
  if (items.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
        <h2 className="text-lg font-medium text-slate-900">No results match your filters</h2>
        <p className="mt-2 text-sm text-slate-600">
          Try lowering the minimum score or clearing the company filter.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="results-table-heading" className="space-y-4">
      <h2 id="results-table-heading" className="sr-only">
        Ranked companies
      </h2>

      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
        <table className="min-w-full divide-y divide-slate-200">
          <caption className="sr-only">Search results with company, score, and explanation</caption>
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Company
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Score
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Explanation
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((result) => (
              <ResultRow key={result.searchResultId} result={result} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 md:hidden">
        {items.map((result) => (
          <ResultCard key={result.searchResultId} result={result} />
        ))}
      </div>

      <Pagination pagination={pagination} onPageChange={onPageChange} />
    </section>
  );
}
