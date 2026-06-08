import { cn } from "@/lib/utils/cn";

interface ScoreBadgeProps {
  score: number | null;
  className?: string;
}

export function ScoreBadge({ score, className }: ScoreBadgeProps) {
  if (score === null) {
    return (
      <span
        className={cn(
          "inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600",
          className,
        )}
      >
        Pending
      </span>
    );
  }

  const tone =
    score >= 70
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : score >= 40
        ? "bg-amber-50 text-amber-700 ring-amber-200"
        : "bg-rose-50 text-rose-700 ring-rose-200";

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        tone,
        className,
      )}
    >
      {Math.round(score)}
    </span>
  );
}
