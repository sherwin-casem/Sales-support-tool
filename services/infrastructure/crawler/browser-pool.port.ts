import type { CrawledPage, CrawlPath } from "@/types/crawler/crawler.types.js";

export interface CrawlPagePort {
  goto(url: string): Promise<{ status: number | null; finalUrl: string }>;
  title(): Promise<string>;
  content(): Promise<{ html: string; text: string }>;
  close(): Promise<void>;
}

export interface BrowserContextPort {
  newPage(): Promise<CrawlPagePort>;
  close(): Promise<void>;
}

export interface BrowserPoolPort {
  withContext<T>(operation: (context: BrowserContextPort) => Promise<T>): Promise<T>;
  shutdown(): Promise<void>;
}

export interface PageCrawlSuccess {
  path: CrawlPath;
  url: string;
  httpStatus: number | null;
  title: string | null;
  contentText: string;
  html: string;
}

export interface PageCrawlOutcome {
  success: boolean;
  page?: PageCrawlSuccess;
  error?: string;
  retryable?: boolean;
}

export interface PageCrawlerPort {
  crawlPage(page: CrawlPagePort, path: CrawlPath, url: string): Promise<PageCrawlOutcome>;
}
