"use client";

import { Package, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/browser-client";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

export interface ServiceCatalogItem {
  name: string;
  description: string;
  valueProps: string[];
  targetIndustries: string[];
}

function createEmptyService(): ServiceCatalogItem {
  return {
    name: "",
    description: "",
    valueProps: [],
    targetIndustries: [],
  };
}

function normalizeCatalog(catalog: unknown): ServiceCatalogItem[] {
  if (!Array.isArray(catalog)) {
    return [];
  }

  return catalog.map((item) => {
    const record = item as Partial<ServiceCatalogItem>;
    return {
      name: typeof record.name === "string" ? record.name : "",
      description: typeof record.description === "string" ? record.description : "",
      valueProps: Array.isArray(record.valueProps)
        ? record.valueProps.filter((value): value is string => typeof value === "string")
        : [],
      targetIndustries: Array.isArray(record.targetIndustries)
        ? record.targetIndustries.filter((value): value is string => typeof value === "string")
        : [],
    };
  });
}

interface StringListFieldProps {
  id: string;
  label: string;
  hint?: string;
  items: string[];
  placeholder?: string;
  onChange: (items: string[]) => void;
}

function StringListField({
  id,
  label,
  hint,
  items,
  placeholder,
  onChange,
}: StringListFieldProps) {
  const [draft, setDraft] = useState("");

  function addItem() {
    const trimmed = draft.trim();
    if (!trimmed || items.includes(trimmed)) {
      return;
    }

    onChange([...items, trimmed]);
    setDraft("");
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label htmlFor={id} className="block text-sm font-medium text-slate-700">
          {label}
        </label>
        {hint ? <p className="text-sm text-slate-500">{hint}</p> : null}
      </div>

      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item, index) => (
            <span
              key={`${item}-${index}`}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-0.5 pl-2.5 pr-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200/80"
            >
              {item}
              <button
                type="button"
                onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
                className="rounded-full p-0.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
                aria-label={`Remove ${item}`}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">No items added yet.</p>
      )}

      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addItem();
            }
          }}
          className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
        <Button type="button" variant="secondary" size="sm" onClick={addItem}>
          Add
        </Button>
      </div>
    </div>
  );
}

interface ServiceCardProps {
  service: ServiceCatalogItem;
  index: number;
  onChange: (service: ServiceCatalogItem) => void;
  onRemove: () => void;
}

function ServiceCard({ service, index, onChange, onRemove }: ServiceCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>Service {index + 1}</CardTitle>
          {service.name ? (
            <p className="text-sm text-slate-500">{service.name}</p>
          ) : (
            <p className="text-sm text-slate-400">Untitled service</p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="shrink-0 text-slate-500 hover:text-rose-600"
          aria-label={`Remove service ${index + 1}`}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </CardHeader>

      <div className="space-y-4">
        <Input
          id={`service-name-${index}`}
          label="Service name"
          required
          value={service.name}
          placeholder="e.g. Custom Software Development"
          onChange={(event) => onChange({ ...service, name: event.target.value })}
        />

        <Textarea
          id={`service-description-${index}`}
          label="Description"
          required
          rows={3}
          value={service.description}
          placeholder="Briefly describe what this service offers and who it helps."
          onChange={(event) => onChange({ ...service, description: event.target.value })}
        />

        <StringListField
          id={`service-value-props-${index}`}
          label="Value propositions"
          hint="Key selling points the AI can reference in outreach messages."
          items={service.valueProps}
          placeholder="e.g. Dedicated agile teams with senior engineers"
          onChange={(valueProps) => onChange({ ...service, valueProps })}
        />

        <StringListField
          id={`service-industries-${index}`}
          label="Target industries"
          hint="Industries where this service is most relevant."
          items={service.targetIndustries}
          placeholder="e.g. SaaS"
          onChange={(targetIndustries) => onChange({ ...service, targetIndustries })}
        />
      </div>
    </Card>
  );
}

export function ServiceCatalogEditor() {
  const [services, setServices] = useState<ServiceCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiFetch<{ servicesCatalog: unknown }>("/api/v1/admin/services")
      .then((response) => {
        setServices(normalizeCatalog(response.servicesCatalog));
      })
      .catch(() => {
        setError("Failed to load services catalog. Please refresh the page.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  function updateService(index: number, service: ServiceCatalogItem) {
    setServices((current) => current.map((item, itemIndex) => (itemIndex === index ? service : item)));
    setSaved(false);
  }

  function removeService(index: number) {
    setServices((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setSaved(false);
  }

  function addService() {
    setServices((current) => [...current, createEmptyService()]);
    setSaved(false);
  }

  function validateServices(): string | null {
    for (const [index, service] of services.entries()) {
      if (!service.name.trim()) {
        return `Service ${index + 1} needs a name.`;
      }

      if (!service.description.trim()) {
        return `Service ${index + 1} needs a description.`;
      }
    }

    return null;
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const validationError = validateServices();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);

    try {
      const servicesCatalog = services.map((service) => ({
        name: service.name.trim(),
        description: service.description.trim(),
        valueProps: service.valueProps,
        targetIndustries: service.targetIndustries,
      }));

      const response = await apiFetch<{ servicesCatalog: unknown }>("/api/v1/admin/services", {
        method: "PUT",
        body: JSON.stringify({ servicesCatalog }),
      });

      setServices(normalizeCatalog(response.servicesCatalog));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Failed to save services catalog. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-20 animate-pulse rounded-[var(--radius-card)] bg-slate-100" />
        <div className="h-64 animate-pulse rounded-[var(--radius-card)] bg-slate-100" />
      </div>
    );
  }

  return (
    <form onSubmit={(event) => void handleSave(event)} className="space-y-6">
      <Alert variant="info" title="How this is used">
        The services catalog is injected into AI outreach prompts so generated messages can
        reference your offerings, value propositions, and target industries for each lead.
      </Alert>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {services.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No services configured"
          description="Add the services your team sells. The AI uses this catalog to personalize outreach messages for each lead."
          action={
            <Button type="button" leftIcon={<Plus className="h-4 w-4" />} onClick={addService}>
              Add first service
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {services.map((service, index) => (
            <ServiceCard
              key={index}
              service={service}
              index={index}
              onChange={(updated) => updateService(index, updated)}
              onRemove={() => removeService(index)}
            />
          ))}
        </div>
      )}

      {services.length > 0 ? (
        <Card padding="sm" className="bg-slate-50/80">
          <p className="text-sm font-medium text-slate-900">Catalog preview</p>
          <p className="mt-1 text-sm text-slate-600">
            {services.length} service{services.length === 1 ? "" : "s"} configured
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {services.map((service, index) => (
              <Badge key={`${service.name}-${index}`} variant="brand">
                {service.name.trim() || `Service ${index + 1}`}
              </Badge>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {services.length > 0 ? (
          <Button
            type="button"
            variant="secondary"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={addService}
          >
            Add service
          </Button>
        ) : null}
        <Button
          type="submit"
          variant={saved ? "secondary" : "primary"}
          isLoading={saving}
          disabled={services.length === 0}
        >
          {saved ? "Saved" : "Save catalog"}
        </Button>
      </div>
    </form>
  );
}
