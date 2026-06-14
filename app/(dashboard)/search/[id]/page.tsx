import { ResultsPageContent } from "@/components/results/ResultsPageContent";

interface SearchResultsPageProps {
  params: Promise<{ id: string }>;
}

export default async function SearchResultsPage({ params }: SearchResultsPageProps) {
  const { id } = await params;

  return <ResultsPageContent searchJobId={id} />;
}
