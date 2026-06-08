import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface AlertProps {
  title?: string;
  children: ReactNode;
  variant?: "error" | "info";
  className?: string;
}

const variantClasses = {
  error: "border-rose-200 bg-rose-50 text-rose-900",
  info: "border-slate-200 bg-white text-slate-700",
};

export function Alert({
  title,
  children,
  variant = "error",
  className,
}: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        variantClasses[variant],
        className,
      )}
    >
      {title ? <p className="font-medium">{title}</p> : null}
      <p className={title ? "mt-1" : undefined}>{children}</p>
    </div>
  );
}
