import { cn } from "@/lib/utils/cn";

interface LogoProps {
  variant?: "light" | "dark";
  showWordmark?: boolean;
  className?: string;
}

export function Logo({ variant = "dark", showWordmark = true, className }: LogoProps) {
  const isLight = variant === "light";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg",
          isLight ? "bg-brand-600 shadow-lg shadow-brand-600/30" : "bg-white/10 ring-1 ring-white/10",
        )}
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <circle
            cx="16"
            cy="16"
            r="5"
            className={isLight ? "fill-white" : "fill-brand-400"}
          />
          <path
            d="M16 4v3M16 25v3M4 16h3M25 16h3M7.05 7.05l2.12 2.12M22.83 22.83l2.12 2.12M7.05 24.95l2.12-2.12M22.83 9.17l2.12-2.12"
            strokeWidth="2"
            strokeLinecap="round"
            className={isLight ? "stroke-white" : "stroke-brand-300"}
          />
          <path
            d="M16 11c-2.76 0-5 2.24-5 5s2.24 5 5 5"
            strokeWidth="1.5"
            strokeLinecap="round"
            className={isLight ? "stroke-white/70" : "stroke-brand-200"}
          />
          <circle cx="22" cy="10" r="1.5" className={isLight ? "fill-brand-200" : "fill-brand-400"} />
        </svg>
      </div>
      {showWordmark ? (
        <div className="leading-tight">
          <span
            className={cn(
              "block text-sm font-semibold tracking-tight",
              isLight ? "text-white" : "text-slate-900",
            )}
          >
            Parijat
          </span>
          <span
            className={cn(
              "block text-[10px] font-medium uppercase tracking-wider",
              isLight ? "text-slate-400" : "text-slate-500",
            )}
          >
            Sales Intelligence
          </span>
        </div>
      ) : null}
    </div>
  );
}
