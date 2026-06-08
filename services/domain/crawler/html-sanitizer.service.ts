const MAX_CONTENT_TEXT_LENGTH = 50_000;
const MAX_HTML_LENGTH = 500_000;

export interface SanitizedPageContent {
  title: string | null;
  contentText: string;
  html: string;
}

export class HtmlSanitizerService {
  sanitize(html: string, title: string | null, visibleText: string): SanitizedPageContent {
    const strippedHtml = this.stripExecutableContent(html);
    const normalizedText = this.normalizeWhitespace(visibleText);

    return {
      title: title?.trim() || null,
      contentText: this.truncate(normalizedText, MAX_CONTENT_TEXT_LENGTH),
      html: this.truncate(strippedHtml, MAX_HTML_LENGTH),
    };
  }

  private stripExecutableContent(html: string): string {
    return html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "");
  }

  private normalizeWhitespace(value: string): string {
    return value.replace(/\s+/g, " ").trim();
  }

  private truncate(value: string, maxLength: number): string {
    if (value.length <= maxLength) {
      return value;
    }

    return value.slice(0, maxLength);
  }
}

export const htmlSanitizerService = new HtmlSanitizerService();
