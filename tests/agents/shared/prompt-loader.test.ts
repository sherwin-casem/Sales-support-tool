import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { PromptLoader } from "@/agents/shared/prompt-loader.js";

describe("PromptLoader", () => {
  let tempDir: string;

  afterEach(async () => {
    tempDir = "";
  });

  it("loads prompt file content", async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "prompt-loader-"));
    const promptsRoot = path.join(tempDir, "prompts");
    await mkdir(path.join(promptsRoot, "discovery"), { recursive: true });
    await writeFile(
      path.join(promptsRoot, "discovery", "query-parser.system.md"),
      "system prompt content",
      "utf8",
    );

    const loader = new PromptLoader(promptsRoot);
    const content = await loader.load("discovery/query-parser.system.md");

    expect(content).toBe("system prompt content");
  });

  it("interpolates template variables", async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "prompt-loader-"));
    const promptsRoot = path.join(tempDir, "prompts");
    await mkdir(path.join(promptsRoot, "discovery"), { recursive: true });
    await writeFile(
      path.join(promptsRoot, "discovery", "query-parser.user.md"),
      'Query:\n"""\n{{query}}\n"""',
      "utf8",
    );

    const loader = new PromptLoader(promptsRoot);
    const content = await loader.loadTemplate("discovery/query-parser.user.md", {
      query: "Find logistics companies in Finland with 50-200 employees.",
    });

    expect(content).toContain(
      "Find logistics companies in Finland with 50-200 employees.",
    );
  });
});
