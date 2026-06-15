import { cn } from "@/lib/utils/cn";
import { ParijatGearIcon } from "@/components/brand/ParijatGearIcon";

interface LogoProps {
  variant?: "light" | "dark";
  showWordmark?: boolean;
  className?: string;
}

export function Logo({ variant = "dark", showWordmark = true, className }: LogoProps) {
  const isLight = variant === "light";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <ParijatGearIcon />
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
