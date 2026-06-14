import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "brand";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-slate-100 text-slate-700 ring-slate-200/80",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200/80",
  warning: "bg-amber-50 text-amber-800 ring-amber-200/80",
  error: "bg-rose-50 text-rose-700 ring-rose-200/80",
  info: "bg-blue-50 text-blue-700 ring-blue-200/80",
  brand: "bg-brand-50 text-brand-700 ring-brand-200/80",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
