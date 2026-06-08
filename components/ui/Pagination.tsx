import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import type { PaginationMeta } from "@/types/api/pagination.api.types";

interface PaginationProps {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ pagination, onPageChange, className }: PaginationProps) {
  const { page, totalPages, totalItems } = pagination;

  if (totalItems === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Results pagination"
      className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}
    >
      <p className="text-sm text-slate-600">
        Page {page} of {totalPages} · {totalItems} result{totalItems === 1 ? "" : "s"}
      </p>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
