import { CompanyDetailContent } from "@/components/company/CompanyDetailContent";

interface CompanyDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CompanyDetailPage({ params }: CompanyDetailPageProps) {
  const { id } = await params;

  return <CompanyDetailContent companyId={id} />;
}
