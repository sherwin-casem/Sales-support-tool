import type { ExtractedCompany } from "@/types/agents/company-extraction.types";

interface ExtractedInformationProps {
  data: ExtractedCompany;
}

export function ExtractedInformation({ data }: ExtractedInformationProps) {
  return (
    <section
      aria-labelledby="extracted-information-heading"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 id="extracted-information-heading" className="text-lg font-semibold text-slate-900">
        Extracted information
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Structured fields extracted from public website content.
      </p>

      <div className="mt-6 space-y-6">
        <TagSection title="Products" items={data.products} emptyLabel="No products identified" />
        <TagSection title="Services" items={data.services} emptyLabel="No services identified" />
        <TagSection
          title="Target customers"
          items={data.targetCustomers}
          emptyLabel="No target customers identified"
        />
      </div>
    </section>
  );
}

function TagSection({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <div>
      <h3 className="text-sm font-medium text-slate-900">{title}</h3>
      {items.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {items.map((item) => (
            <li
              key={item}
              className="rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-700 ring-1 ring-inset ring-brand-100"
            >
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-500">{emptyLabel}</p>
      )}
    </div>
  );
}
