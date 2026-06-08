import { stripPromptInjectionPatterns } from "@/lib/security/prompt-safety.js";

export class PromptSanitizerService {
  sanitizeCrawlContent(content: string, maxLength = 24_000): string {
    const stripped = stripPromptInjectionPatterns(content);
    return stripped.slice(0, maxLength);
  }
}

export const promptSanitizerService = new PromptSanitizerService();
