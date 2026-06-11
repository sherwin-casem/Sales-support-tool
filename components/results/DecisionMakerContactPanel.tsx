"use client";

import type { DecisionMakerContact } from "@/lib/results/decision-maker-contact";
import { displayValue, hasDisplayValue } from "@/lib/results/display-fields";
import { normalizePhoneHref } from "@/lib/results/profile-contacts";

interface DecisionMakerContactPanelProps {
  contact: DecisionMakerContact;
  highlighted?: boolean;
}

export function DecisionMakerContactPanel({
  contact,
  highlighted = false,
}: DecisionMakerContactPanelProps) {
  return (
    <section
      id="decision-maker-contact"
      aria-labelledby="decision-maker-heading"
      className={
        highlighted
          ? "rounded-xl border border-brand-200 bg-brand-50/60 p-4 ring-1 ring-brand-100"
          : "space-y-3"
      }
    >
      <h3
        id="decision-maker-heading"
        className="text-sm font-semibold uppercase tracking-wide text-slate-500"
      >
        Decision maker contact
      </h3>

      <p className="text-base font-medium text-slate-900">{contact.name}</p>

      <dl className="mt-3 space-y-3">
        {contact.email ? (
          <ContactDetail
            label="Email"
            value={contact.email}
            href={`mailto:${contact.email}`}
          />
        ) : null}
        {contact.phone ? (
          <ContactDetail
            label="Phone"
            value={contact.phone}
            href={`tel:${normalizePhoneHref(contact.phone)}`}
          />
        ) : null}
        {hasDisplayValue(contact.linkedInUrl) ? (
          <ContactDetail
            label="LinkedIn"
            value={contact.linkedInUrl}
            href={contact.linkedInUrl}
            external
          />
        ) : null}
      </dl>
    </section>
  );
}

function ContactDetail({
  label,
  value,
  href,
  external = false,
}: {
  label: string;
  value: string | null;
  href: string | null;
  external?: boolean;
}) {
  if (!hasDisplayValue(value) && !href) {
    return null;
  }

  const display = displayValue(value ?? undefined);

  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm">
        {href && value ? (
          <a
            href={href}
            target={external ? "_blank" : undefined}
            rel={external ? "noopener noreferrer" : undefined}
            className="font-medium text-brand-600 hover:text-brand-700"
          >
            {display}
          </a>
        ) : (
          <span className="text-slate-500">{display}</span>
        )}
      </dd>
    </div>
  );
}
