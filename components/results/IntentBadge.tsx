interface IntentBadgeProps {
  score: number | null | undefined;
  className?: string;
}

export function IntentBadge({ score, className = "" }: IntentBadgeProps) {
  if (score == null || score <= 0) {
    return <span className={`text-xs text-slate-400 ${className}`}>No score</span>;
  }

  const percent = Math.round(score * 100);
  const tone =
    score >= 0.7 ? "bg-emerald-100 text-emerald-800" : score >= 0.4 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone} ${className}`}
      title={`Intent score ${percent}%`}
    >
      {percent}%
    </span>
  );
}
