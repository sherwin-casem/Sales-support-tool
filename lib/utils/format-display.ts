export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) {
    return "—";
  }

  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatCompleteness(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }

  return `${Math.round(value * 100)}%`;
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}
