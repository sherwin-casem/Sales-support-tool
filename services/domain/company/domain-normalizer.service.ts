import { DISCOVERY_BLOCKED_DOMAINS } from "@/lib/config/discovery-blocklist.js";

const BLOCKED_DOMAINS = new Set<string>(DISCOVERY_BLOCKED_DOMAINS);

export class DomainBlocklistService {
  isBlocked(domain: string): boolean {
    const normalized = domain.toLowerCase();

    for (const blocked of BLOCKED_DOMAINS) {
      if (normalized === blocked || normalized.endsWith(`.${blocked}`)) {
        return true;
      }
    }

    return false;
  }
}

export const domainBlocklistService = new DomainBlocklistService();

export function normalizeDomain(input: string): string | null {
  try {
    const withProtocol = input.includes("://") ? input : `https://${input}`;
    const url = new URL(withProtocol);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");

    if (!hostname || !hostname.includes(".")) {
      return null;
    }

    return hostname;
  } catch {
    return null;
  }
}

export function normalizeWebsiteUrl(input: string): string | null {
  try {
    const withProtocol = input.includes("://") ? input : `https://${input}`;
    const url = new URL(withProtocol);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    url.hash = "";
    url.search = "";

    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export class DomainNormalizerService {
  normalizeWebsite(input: string): { domain: string; website: string } | null {
    const website = normalizeWebsiteUrl(input);
    if (!website) {
      return null;
    }

    const domain = normalizeDomain(website);
    if (!domain) {
      return null;
    }

    return { domain, website };
  }
}

export const domainNormalizerService = new DomainNormalizerService();
