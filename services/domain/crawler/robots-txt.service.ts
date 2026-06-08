import type { HttpClient } from "@/lib/http/http-client.js";
import type { CrawlPath } from "@/types/crawler/crawler.types.js";

export class RobotsTxtService {
  private readonly cache = new Map<string, { rules: RobotsRules; fetchedAt: number }>();
  private readonly cacheTtlMs = 60 * 60 * 1000;

  constructor(private readonly http: HttpClient) {}

  async isAllowed(baseUrl: string, path: CrawlPath): Promise<boolean> {
    const origin = new URL(baseUrl).origin;
    const rules = await this.getRules(origin);

    if (!rules) {
      return false;
    }

    return rules.isAllowed(path);
  }

  private async getRules(origin: string): Promise<RobotsRules | null> {
    const cached = this.cache.get(origin);

    if (cached && Date.now() - cached.fetchedAt < this.cacheTtlMs) {
      return cached.rules;
    }

    try {
      const robotsUrl = `${origin}/robots.txt`;
      const response = await this.http.get(robotsUrl, {
        headers: { "User-Agent": "SalesIntelligenceBot/1.0" },
      });

      if (!response.ok) {
        this.cache.set(origin, { rules: new RobotsRules([]), fetchedAt: Date.now() });
        return null;
      }

      const rules = RobotsRules.parse(await response.text());
      this.cache.set(origin, { rules, fetchedAt: Date.now() });
      return rules;
    } catch {
      return null;
    }
  }
}

class RobotsRules {
  constructor(private readonly disallowRules: string[]) {}

  static parse(content: string): RobotsRules {
    const lines = content.split("\n").map((line) => line.trim());
    const disallowRules: string[] = [];
    let applies = false;

    for (const line of lines) {
      if (line.toLowerCase().startsWith("user-agent:")) {
        const agent = line.split(":")[1]?.trim().toLowerCase() ?? "";
        applies = agent === "*" || agent.includes("salesintelligencebot");
        continue;
      }

      if (!applies) {
        continue;
      }

      if (line.toLowerCase().startsWith("disallow:")) {
        const rule = line.split(":")[1]?.trim() ?? "";
        if (rule) {
          disallowRules.push(rule);
        }
      }
    }

    return new RobotsRules(disallowRules);
  }

  isAllowed(path: CrawlPath): boolean {
    for (const rule of this.disallowRules) {
      if (rule === "/") {
        return false;
      }

      if (path.startsWith(rule)) {
        return false;
      }
    }

    return true;
  }
}

export function createRobotsTxtService(http: HttpClient): RobotsTxtService {
  return new RobotsTxtService(http);
}
