export const CRAWL_PATHS = ["/", "/about", "/company", "/contact", "/careers"] as const;

export type CrawlPath = (typeof CRAWL_PATHS)[number];

export interface CrawlCompanyInput {
  companyId: string;
  website: string;
  normalizedDomain: string;
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
