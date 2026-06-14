import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
}

const fieldClasses =
  "h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 shadow-sm transition-colors hover:border-slate-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-slate-100";

export function Select({ id, label, error, className, children, ...props }: SelectProps) {
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>

      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={cn(
          fieldClasses,
          error ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20" : "border-slate-200",
          className,
        )}
        {...props}
      >
        {children}
      </select>

      {error ? (
        <p id={errorId} role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
