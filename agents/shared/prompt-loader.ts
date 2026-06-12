import { readFile } from "node:fs/promises";
import path from "node:path";
import { escapePromptLiteral } from "@/lib/security/prompt-safety.js";

export class PromptLoader {
  // Prompt files are static at runtime, so cache them after the first read.
  private readonly cache = new Map<string, string>();

  constructor(private readonly promptsRoot = path.join(process.cwd(), "prompts")) {}

  async load(relativePath: string): Promise<string> {
    const cached = this.cache.get(relativePath);

    if (cached !== undefined) {
      return cached;
    }

    const filePath = path.join(this.promptsRoot, relativePath);
    const content = await readFile(filePath, "utf8");

    this.cache.set(relativePath, content);

    return content;
  }

  async loadTemplate(
    relativePath: string,
    variables: Record<string, string>,
  ): Promise<string> {
    const template = await this.load(relativePath);

    return Object.entries(variables).reduce((content, [key, value]) => {
      return content.replaceAll(`{{${key}}}`, escapePromptLiteral(value));
    }, template);
  }
}

export const promptLoader = new PromptLoader();
