import type { HttpClient } from "@/lib/http/http-client.js";
import {
  assertValidWikidataQid,
  sanitizeSparqlLiteral,
} from "@/lib/security/prompt-safety.js";
import { withRetry } from "@/lib/utils/retry.js";
import {
  expandIndustrySearchTerms,
  isGenericIndustry,
} from "@/services/domain/discovery/industry-terms.service.js";
import type {
  DiscoveryCriteria,
  RawDiscoveryCandidate,
} from "@/types/agents/company-discovery.types.js";
import {
  DiscoverySourceError,
  type DiscoverySource,
} from "@/services/infrastructure/discovery/sources/discovery-source.interface.js";

const WIKIDATA_ENDPOINT = "https://query.wikidata.org/sparql";
const USER_AGENT = "SalesIntelligenceBot/1.0 (company discovery; contact@example.com)";

export class WikidataDiscoverySource implements DiscoverySource {
  readonly name = "wikidata";
  readonly tier = 1 as const;

  constructor(private readonly http: HttpClient) {}

  async discover(criteria: DiscoveryCriteria): Promise<RawDiscoveryCandidate[]> {
    if (!criteria.locationContext.countryQid) {
      return [];
    }

    const query = buildSparqlQuery(
      criteria.industry,
      criteria.locationContext.countryQid,
      criteria.limit,
    );

    return withRetry(
      async () => {
        const payload = await executeSparqlQuery(this.http, query);
        return mapBindings(payload);
      },
      {
        maxAttempts: 3,
        initialDelayMs: 500,
        shouldRetry: (error) => error instanceof DiscoverySourceError,
      },
    ).catch((error) => {
      throw new DiscoverySourceError(
        this.name,
        error instanceof Error ? error.message : "Wikidata discovery failed",
        error,
      );
    });
  }
}

async function executeSparqlQuery(
  http: HttpClient,
  query: string,
): Promise<WikidataResponse> {
  const headers = {
    Accept: "application/sparql-results+json",
    "User-Agent": USER_AGENT,
  };
  const params = new URLSearchParams({
    query,
    format: "json",
  });

  const postResponse = await http.post(WIKIDATA_ENDPOINT, params, { headers });

  if (postResponse.ok) {
    return JSON.parse(await postResponse.text()) as WikidataResponse;
  }

  if (shouldFallbackToGet(postResponse.status)) {
    const getUrl = `${WIKIDATA_ENDPOINT}?${params.toString()}`;
    const getResponse = await http.get(getUrl, { headers });

    if (getResponse.ok) {
      return JSON.parse(await getResponse.text()) as WikidataResponse;
    }

    throw new DiscoverySourceError(
      "wikidata",
      `Wikidata GET request failed with status ${getResponse.status}`,
    );
  }

  throw new DiscoverySourceError(
    "wikidata",
    `Wikidata request failed with status ${postResponse.status}`,
  );
}

function shouldFallbackToGet(status: number): boolean {
  return status === 405 || status === 403 || status === 414;
}

export function buildSparqlQuery(
  industry: string,
  countryQid: string,
  limit: number,
): string {
  assertValidWikidataQid(countryQid);
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);
  const industryTerms = expandIndustrySearchTerms(industry);
  const industryFilter = buildIndustryFilter(industry, industryTerms);

  return `
SELECT DISTINCT ?companyLabel ?website WHERE {
  ?company wdt:P31/wdt:P279* wd:Q4830453 .
  ?company wdt:P17 wd:${countryQid.toUpperCase()} .
  ?company wdt:P856 ?website .
  ${industryFilter}
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT ${safeLimit}
`.trim();
}

function buildIndustryFilter(industry: string, industryTerms: string[]): string {
  if (isGenericIndustry(industry) || industryTerms.length === 0) {
    return "";
  }

  const escapedTerms = industryTerms
    .map((term) => sanitizeSparqlLiteral(term).replace(/"/g, '\\"'))
    .slice(0, 8);

  const industryClauses = escapedTerms
    .map(
      (term) =>
        `CONTAINS(LCASE(STR(?industryLabel)), "${term}")`,
    )
    .join(" || ");
  const labelClauses = escapedTerms
    .map(
      (term) =>
        `CONTAINS(LCASE(STR(?fallbackLabel)), "${term}")`,
    )
    .join(" || ");

  return `{
    ?company wdt:P452/wdt:P279* ?industry .
    ?industry rdfs:label ?industryLabel .
    FILTER(LANG(?industryLabel) = "en")
    FILTER(${industryClauses})
  } UNION {
    ?company rdfs:label ?fallbackLabel .
    FILTER(LANG(?fallbackLabel) = "en")
    FILTER(${labelClauses})
  }`;
}

interface WikidataResponse {
  results?: {
    bindings?: Array<{
      companyLabel?: { value: string };
      website?: { value: string };
    }>;
  };
}

function mapBindings(payload: WikidataResponse): RawDiscoveryCandidate[] {
  const bindings = payload.results?.bindings ?? [];

  return bindings
    .filter((binding) => binding.website?.value && binding.companyLabel?.value)
    .map((binding) => ({
      companyName: binding.companyLabel!.value,
      website: binding.website!.value,
      source: "wikidata",
      confidence: 0.85,
    }));
}

export function createWikidataDiscoverySource(http: HttpClient): WikidataDiscoverySource {
  return new WikidataDiscoverySource(http);
}
