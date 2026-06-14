import type { LucideIcon } from "lucide-react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface AlertProps {
  title?: string;
  children: ReactNode;
  variant?: "error" | "info" | "success" | "warning";
  className?: string;
}

const variantClasses = {
  error: "border-rose-200 bg-rose-50 text-rose-900",
  info: "border-slate-200 bg-slate-50 text-slate-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
};

const variantIcons = {
  error: AlertCircle,
  info: Info,
  success: CheckCircle2,
  warning: AlertCircle,
} as const satisfies Record<NonNullable<AlertProps["variant"]>, LucideIcon>;

export function Alert({
  title,
  children,
  variant = "error",
  className,
}: AlertProps) {
  const Icon = variantIcons[variant];

  return (
    <div
      role="alert"
      className={cn(
        "flex gap-3 rounded-xl border px-4 py-3 text-sm",
        variantClasses[variant],
        className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>
        {title ? <p className="font-medium">{title}</p> : null}
        <p className={title ? "mt-1" : undefined}>{children}</p>
      </div>
    </div>
  );
}
