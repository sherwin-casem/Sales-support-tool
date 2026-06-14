"use client";

interface ExampleQueryChipsProps {
  examples: readonly string[];
  disabled?: boolean;
  onSelect: (query: string) => void;
}

export function ExampleQueryChips({
  examples,
  disabled = false,
  onSelect,
}: ExampleQueryChipsProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        Example queries
      </p>
      <div className="flex flex-wrap gap-2">
        {examples.map((example) => (
          <button
            key={example}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(example)}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-sm text-slate-600 transition-all hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
