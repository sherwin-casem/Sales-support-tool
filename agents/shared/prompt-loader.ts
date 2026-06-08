import { readFile } from "node:fs/promises";
import path from "node:path";
import { escapePromptLiteral } from "@/lib/security/prompt-safety.js";

export class PromptLoader {
  constructor(private readonly promptsRoot = path.join(process.cwd(), "prompts")) {}

  async load(relativePath: string): Promise<string> {
    const filePath = path.join(this.promptsRoot, relativePath);
    return readFile(filePath, "utf8");
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
