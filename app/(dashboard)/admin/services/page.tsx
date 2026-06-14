"use client";

import { ServiceCatalogEditor } from "@/components/admin/ServiceCatalogEditor";
import { PageHeader } from "@/components/ui/PageHeader";

export default function AdminServicesPage() {
  return (
    <main className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <PageHeader
          eyebrow="Administration"
          title="Services catalog"
          description="Define what your organization sells. This catalog powers AI-generated outreach by giving the model your services, value propositions, and target industries."
        />

        <ServiceCatalogEditor />
      </div>
    </main>
  );
}
