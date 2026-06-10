export const CRAWL_PATHS = ["/", "/about", "/company", "/contact", "/careers"] as const;

/** Targeted paths for hybrid outreach gap-filling (contact / team pages). */
export const CONTACT_CRAWL_PATHS = ["/contact", "/about", "/team"] as const;

export const ALL_CRAWL_PATHS = [
  ...CRAWL_PATHS,
  ...CONTACT_CRAWL_PATHS.filter((path) => !(CRAWL_PATHS as readonly string[]).includes(path)),
] as const;

export type CrawlPath = (typeof ALL_CRAWL_PATHS)[number];

export interface CrawlCompanyInput {
  companyId: string;
  website: string;
  normalizedDomain: string;
  paths?: readonly CrawlPath[];
}

export interface CrawledPage {
  path: CrawlPath;
  url: string;
  httpStatus: number | null;
  title: string | null;
  contentText: string;
  html: string;
  crawledAt: string;
  error?: string;
}

export type CrawlCompanyStatus = "success" | "partial" | "failed";

export interface CrawlCompanyResult {
  companyId: string;
  domain: string;
  baseUrl: string;
  pages: CrawledPage[];
  status: CrawlCompanyStatus;
  pagesSucceeded: number;
  pagesAttempted: number;
  durationMs: number;
}

export interface ResolvedCrawlTarget {
  path: CrawlPath;
  url: string;
}
