import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function DataTable({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-[var(--radius-card)] border border-slate-200/80", className)}>
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}

export function DataTableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-slate-200 bg-slate-50/80">
      <tr>{children}</tr>
    </thead>
  );
}

export function DataTableHeaderCell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function DataTableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-slate-100 bg-white">{children}</tbody>;
}

export function DataTableRow({ children }: { children: ReactNode }) {
  return <tr className="transition-colors hover:bg-slate-50/80">{children}</tr>;
}

export function DataTableCell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <td className={cn("px-4 py-3 text-slate-700", className)}>{children}</td>;
}
