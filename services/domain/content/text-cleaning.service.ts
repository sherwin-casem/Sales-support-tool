import { parse, type HTMLElement, type Node } from "node-html-parser";
import {
  BLOCK_TAGS,
  BOILERPLATE_CLASS_ID_PATTERNS,
  BOILERPLATE_SELECTORS,
  JSON_LD_TYPES,
  MAIN_CONTENT_SELECTORS,
  REMOVABLE_TAGS,
} from "@/services/domain/content/rules/boilerplate-rules.js";
import {
  containsBusinessSignals,
  matchesBoilerplatePattern,
} from "@/services/domain/content/rules/business-keywords.js";
import {
  DEFAULT_MAX_BODY_CHARS,
  type ContentHeading,
  type ContentMetadata,
  type LlmReadyContent,
  type TextCleaningInput,
} from "@/types/content/text-cleaning.types.js";

const MIN_QUALITY_CHARS = 100;

export interface TextCleaningOptions {
  maxBodyChars?: number;
}

export class TextCleaningService {
  clean(input: TextCleaningInput, options: TextCleaningOptions = {}): LlmReadyContent {
    const maxBodyChars = options.maxBodyChars ?? DEFAULT_MAX_BODY_CHARS;
    const inputBytes = Buffer.byteLength(input.html, "utf8");
    let blocksRemoved = 0;

    const jsonLd = extractJsonLd(input.html);
    const root = parse(input.html, {
      blockTextElements: {
        script: true,
        style: true,
        pre: true,
      },
    });

    blocksRemoved += removeTags(root, REMOVABLE_TAGS);
    blocksRemoved += removeHiddenElements(root);
    blocksRemoved += removeBoilerplate(root);

    const contentRoot = selectMainContent(root);
    const metadata = extractMetadata(root, contentRoot, input.title, jsonLd);
    const bodyText = flattenContent(contentRoot);
    let body = composeLlmDocument(metadata, bodyText, input.url, input.pagePath);
    body = enforceTokenBudget(body, maxBodyChars);

    const outputChars = body.length;
    const lowQuality = outputChars < MIN_QUALITY_CHARS;

    return {
      body,
      metadata,
      stats: {
        inputBytes,
        outputChars,
        compressionRatio: inputBytes > 0 ? outputChars / inputBytes : 0,
        blocksRemoved,
        sectionsPreserved: metadata.headings.length,
        lowQuality,
      },
      source: {
        url: input.url,
        pagePath: input.pagePath,
        cleanedAt: new Date().toISOString(),
      },
    };
  }
}

function extractJsonLd(html: string): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = [];
  const pattern =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  let match = pattern.exec(html);

  while (match !== null) {
    try {
      const parsed = JSON.parse(match[1].trim()) as unknown;
      collectJsonLdObjects(parsed, results);
    } catch {
      // ignore invalid JSON-LD blocks
    }

    match = pattern.exec(html);
  }

  return dedupeJsonLd(results);
}

function collectJsonLdObjects(value: unknown, results: Record<string, unknown>[]): void {
  if (Array.isArray(value)) {
    value.forEach((item) => collectJsonLdObjects(item, results));
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  const record = value as Record<string, unknown>;
  const typeValue = record["@type"];
  const types = Array.isArray(typeValue) ? typeValue : [typeValue];

  if (types.some((type) => typeof type === "string" && JSON_LD_TYPES.has(type))) {
    results.push(record);
  }

  if (record["@graph"]) {
    collectJsonLdObjects(record["@graph"], results);
  }
}

function dedupeJsonLd(items: Record<string, unknown>[]): Record<string, unknown>[] {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = `${String(item["@type"] ?? "")}:${String(item.name ?? item.url ?? "")}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function removeTags(root: HTMLElement, tags: Set<string>): number {
  let removed = 0;

  for (const tag of tags) {
    const nodes = root.querySelectorAll(tag);
    for (const node of nodes) {
      node.remove();
      removed += 1;
    }
  }

  return removed;
}

function removeHiddenElements(root: HTMLElement): number {
  let removed = 0;
  const nodes = root.querySelectorAll("*");

  for (const node of nodes) {
    const style = node.getAttribute("style")?.toLowerCase() ?? "";
    const hidden =
      node.getAttribute("aria-hidden") === "true" ||
      style.includes("display:none") ||
      style.includes("visibility:hidden");

    if (hidden && !isProtectedNode(node)) {
      node.remove();
      removed += 1;
    }
  }

  return removed;
}

function removeBoilerplate(root: HTMLElement): number {
  let removed = 0;

  for (const selector of BOILERPLATE_SELECTORS) {
    for (const node of root.querySelectorAll(selector)) {
      if (!isProtectedNode(node)) {
        node.remove();
        removed += 1;
      }
    }
  }

  const candidates = root.querySelectorAll("*");

  for (const node of candidates) {
    const id = node.getAttribute("id") ?? "";
    const className = node.getAttribute("class") ?? "";
    const marker = `${id} ${className}`.toLowerCase();

    if (
      matchesBoilerplatePattern(marker) &&
      !isProtectedNode(node) &&
      !isMainContentCandidate(node)
    ) {
      node.remove();
      removed += 1;
    }
  }

  removeNavigationLists(root);

  return removed;
}

function removeNavigationLists(root: HTMLElement): void {
  for (const list of root.querySelectorAll("ul, ol")) {
    if (isProtectedNode(list) || isMainContentCandidate(list)) {
      continue;
    }

    const items = list.querySelectorAll("li");
    if (items.length === 0) {
      continue;
    }

    const linkItems = items.filter((item) => item.querySelector("a") !== null);
    const ratio = linkItems.length / items.length;

    if (ratio >= 0.8 && items.length >= 4) {
      list.remove();
    }
  }
}

function isProtectedNode(node: HTMLElement): boolean {
  const text = node.text.replace(/\s+/g, " ").trim();
  return containsBusinessSignals(text);
}

function isMainContentCandidate(node: HTMLElement): boolean {
  const tag = node.tagName?.toLowerCase() ?? "";
  return tag === "main" || tag === "article" || node.getAttribute("role") === "main";
}

function selectMainContent(root: HTMLElement): HTMLElement {
  for (const selector of MAIN_CONTENT_SELECTORS) {
    const main = root.querySelector(selector);
    if (main) {
      return main;
    }
  }

  const candidates = root.querySelectorAll("section, article, div");
  let best: HTMLElement = root;
  let bestScore = scoreContentNode(root);

  for (const candidate of candidates) {
    const score = scoreContentNode(candidate);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  return bestScore > 0 ? best : root;
}

function scoreContentNode(node: HTMLElement): number {
  const tag = node.tagName?.toLowerCase() ?? "";
  if (!tag) {
    return 0;
  }
  const text = node.text.replace(/\s+/g, " ").trim();
  const className = `${node.getAttribute("id") ?? ""} ${node.getAttribute("class") ?? ""}`.toLowerCase();

  let score = 0;

  if (tag === "main" || node.getAttribute("role") === "main") {
    score += 100;
  }

  if (tag === "article") {
    score += 80;
  }

  if (node.querySelector("h1")) {
    score += 30;
  }

  if (containsBusinessSignals(text)) {
    score += 20;
  }

  const tagCount = node.querySelectorAll("*").length || 1;
  score += Math.min(40, Math.floor(text.length / tagCount));

  if (text.length < 100) {
    score -= 20;
  }

  if (BOILERPLATE_CLASS_ID_PATTERNS.some((pattern) => className.includes(pattern))) {
    score -= 60;
  }

  const links = node.querySelectorAll("a").length;
  if (text.length > 0 && links / Math.max(text.split(" ").length, 1) > 0.2) {
    score -= 40;
  }

  return score;
}

function extractMetadata(
  root: HTMLElement,
  contentRoot: HTMLElement,
  title: string | null | undefined,
  jsonLd: Record<string, unknown>[],
): ContentMetadata {
  const titleNode = root.querySelector("title")?.text.trim();
  const description =
    root.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() ??
    root.querySelector('meta[property="og:description"]')?.getAttribute("content")?.trim() ??
    null;
  const language =
    root.querySelector("html")?.getAttribute("lang")?.trim() ??
    root.querySelector('meta[http-equiv="content-language"]')?.getAttribute("content")?.trim() ??
    null;

  return {
    title: title?.trim() || titleNode || null,
    description,
    jsonLd,
    headings: extractHeadings(contentRoot),
    language: language || null,
  };
}

function extractHeadings(root: HTMLElement): ContentHeading[] {
  const headings: ContentHeading[] = [];
  collectHeadingsInOrder(root, headings);
  return headings;
}

function collectHeadingsInOrder(node: HTMLElement, headings: ContentHeading[]): void {
  const tag = node.tagName?.toLowerCase() ?? "";

  if (/^h[1-6]$/.test(tag)) {
    const text = node.text.replace(/\s+/g, " ").trim();
    if (text) {
      headings.push({ level: Number(tag[1]), text });
    }
    return;
  }

  for (const child of node.childNodes) {
    if (child.nodeType === 1) {
      collectHeadingsInOrder(child as HTMLElement, headings);
    }
  }
}

function flattenContent(root: HTMLElement): string {
  const lines: string[] = [];
  walkNodes(root, lines);
  return dedupeLines(lines).join("\n").trim();
}

function walkNodes(node: Node, lines: string[]): void {
  if (node.nodeType === 3) {
    const text = (node.text ?? "").replace(/\s+/g, " ").trim();
    if (text) {
      lines.push(text);
    }
    return;
  }

  if (node.nodeType !== 1) {
    return;
  }

  const element = node as HTMLElement;
  const tag = element.tagName?.toLowerCase() ?? "";

  if (!tag) {
    for (const child of element.childNodes) {
      walkNodes(child, lines);
    }
    return;
  }

  if (tag === "h1" || tag === "h2" || tag === "h3" || tag === "h4" || tag === "h5" || tag === "h6") {
    const level = Number(tag.slice(1));
    const text = element.text.replace(/\s+/g, " ").trim();
    if (text) {
      lines.push(`${"#".repeat(level)} ${text}`);
    }
    return;
  }

  if (BLOCK_TAGS.has(tag)) {
    const text = element.text.replace(/\s+/g, " ").trim();
    if (text) {
      lines.push(text);
    }
    return;
  }

  for (const child of element.childNodes) {
    walkNodes(child, lines);
  }
}

function dedupeLines(lines: string[]): string[] {
  const result: string[] = [];

  for (const line of lines) {
    if (result[result.length - 1] !== line) {
      result.push(line);
    }
  }

  return result;
}

function composeLlmDocument(
  metadata: ContentMetadata,
  bodyText: string,
  url: string,
  pagePath: string,
): string {
  const sections: string[] = [`--- PAGE: ${pagePath} ---`, `URL: ${url}`];

  if (metadata.title) {
    sections.push(`TITLE: ${metadata.title}`);
  }

  if (metadata.description) {
    sections.push(`DESCRIPTION: ${metadata.description}`);
  }

  if (metadata.headings.length > 0) {
    sections.push("", "HEADINGS:");
    for (const heading of metadata.headings) {
      sections.push(`${"#".repeat(heading.level)} ${heading.text}`);
    }
  }

  sections.push("", "CONTENT:", bodyText);

  if (metadata.jsonLd.length > 0) {
    sections.push("", "STRUCTURED DATA:");
    for (const item of metadata.jsonLd) {
      sections.push(JSON.stringify(item));
    }
  }

  return sections.join("\n");
}

function enforceTokenBudget(body: string, maxChars: number): string {
  if (body.length <= maxChars) {
    return body;
  }

  const contentMarker = "\nCONTENT:\n";
  const markerIndex = body.indexOf(contentMarker);

  if (markerIndex === -1) {
    return body.slice(0, maxChars);
  }

  const prefix = body.slice(0, markerIndex + contentMarker.length);
  const content = body.slice(markerIndex + contentMarker.length);
  const remaining = Math.max(maxChars - prefix.length, 0);

  return `${prefix}${content.slice(0, remaining)}`;
}

export const textCleaningService = new TextCleaningService();
