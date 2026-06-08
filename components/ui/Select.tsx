import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
}

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
          "w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm",
          "disabled:cursor-not-allowed disabled:bg-slate-100",
          error
            ? "border-rose-300 focus:border-rose-500"
            : "border-slate-200 focus:border-brand-500",
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
