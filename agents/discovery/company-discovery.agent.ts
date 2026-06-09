import type { Agent } from "@/agents/base/agent.interface.js";
import { PromptLoader } from "@/agents/shared/prompt-loader.js";
import type { OpenAIClientPort } from "@/lib/config/openai.client.js";
import { aiLogger } from "@/lib/logging/logger.js";
import { wrapUntrustedContent } from "@/lib/security/prompt-safety.js";
import {
  CompanyDiscoveryInputSchema,
  DISCOVERED_COMPANY_LIST_JSON_SCHEMA,
  DiscoveredCompanyListResponseSchema,
} from "@/lib/validations/company-discovery.schema.js";
import { err, ok, type Result } from "@/lib/utils/result.js";
import { companyDeduplicatorService } from "@/services/domain/company/company-deduplicator.service.js";
import { DiscoveryError } from "@/types/agents/discovery-error.types.js";
import {
  COMPANY_DISCOVERY_PROMPT_VERSION,
  type CompanyDiscoveryInput,
  type DiscoveredCompany,
  type RawDiscoveryCandidate,
} from "@/types/agents/company-discovery.types.js";

const SYSTEM_PROMPT_PATH = "discovery/company-discovery.system.md";
const USER_PROMPT_PATH = "discovery/company-discovery.user.md";
const SCHEMA_NAME = "discovered_companies";
const DISCOVERY_SOURCE = "openai_web_search";
const DEFAULT_CONFIDENCE = 0.85;
const MAX_ATTEMPTS = 2;

export interface CompanyDiscoveryAgentOptions {
  model: string;
  promptLoader?: PromptLoader;
  maxAttempts?: number;
  deduplicator?: typeof companyDeduplicatorService;
  searchContextSize?: "low" | "medium" | "high";
}

export class CompanyDiscoveryAgent
  implements Agent<CompanyDiscoveryInput, DiscoveredCompany[], DiscoveryError>
{
  private readonly promptLoader: PromptLoader;
  private readonly maxAttempts: number;
  private readonly deduplicator: typeof companyDeduplicatorService;

  constructor(
    private readonly openai: OpenAIClientPort,
    private readonly options: CompanyDiscoveryAgentOptions,
  ) {
    this.promptLoader = options.promptLoader ?? new PromptLoader();
    this.maxAttempts = options.maxAttempts ?? MAX_ATTEMPTS;
    this.deduplicator = options.deduplicator ?? companyDeduplicatorService;
  }

  async execute(
    input: CompanyDiscoveryInput,
  ): Promise<Result<DiscoveredCompany[], DiscoveryError>> {
    const parsedInput = CompanyDiscoveryInputSchema.safeParse(input);

    if (!parsedInput.success) {
      return err(
        new DiscoveryError(
          "INVALID_INPUT",
          parsedInput.error.issues.map((issue) => issue.message).join("; "),
          parsedInput.error,
        ),
      );
    }

    let lastValidationError: DiscoveryError | undefined;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      const completionResult = await this.requestCompletion(parsedInput.data);

      if (!completionResult.ok) {
        if (attempt === this.maxAttempts) {
          return completionResult;
        }

        continue;
      }

      const validated = this.validateOutput(completionResult.value, parsedInput.data.limit);

      if (validated.ok) {
        aiLogger.info("CompanyDiscoveryAgent.execute completed", {
          queryLength: parsedInput.data.query.length,
          industryHint: parsedInput.data.industry ?? "not specified",
          locationHint: parsedInput.data.location ?? "not specified",
          limit: parsedInput.data.limit,
          resultCount: validated.value.length,
          attempt,
          promptVersion: COMPANY_DISCOVERY_PROMPT_VERSION,
        });

        return validated;
      }

      lastValidationError = validated.error;

      if (attempt === this.maxAttempts) {
        return err(validated.error);
      }
    }

    return err(
      lastValidationError ??
        new DiscoveryError("DISCOVERY_FAILED", "Failed to discover companies"),
    );
  }

  private async requestCompletion(
    input: CompanyDiscoveryInputValidated,
  ): Promise<Result<string, DiscoveryError>> {
    try {
      const [systemPrompt, userPrompt] = await Promise.all([
        this.promptLoader.load(SYSTEM_PROMPT_PATH),
        this.promptLoader.loadTemplate(USER_PROMPT_PATH, {
          query: wrapUntrustedContent("user_query", input.query),
          limit: String(input.limit),
          industryHint: input.industry ?? "not specified",
          locationHint: input.location ?? "not specified",
        }),
      ]);

      const content = await this.openai.createWebDiscoveryCompletion({
        model: this.options.model,
        instructions: systemPrompt,
        input: userPrompt,
        schemaName: SCHEMA_NAME,
        schema: DISCOVERED_COMPANY_LIST_JSON_SCHEMA,
        searchContextSize: this.options.searchContextSize,
      });

      if (!content.trim()) {
        return err(new DiscoveryError("DISCOVERY_FAILED", "OpenAI returned empty content"));
      }

      return ok(content);
    } catch (error) {
      return err(
        new DiscoveryError(
          "DISCOVERY_FAILED",
          error instanceof Error ? error.message : "OpenAI web discovery request failed",
          error,
        ),
      );
    }
  }

  private validateOutput(
    content: string,
    limit: number,
  ): Result<DiscoveredCompany[], DiscoveryError> {
    let parsed: unknown;

    try {
      parsed = JSON.parse(content);
    } catch (error) {
      return err(
        new DiscoveryError(
          "DISCOVERY_FAILED",
          "OpenAI returned invalid JSON for discovered companies",
          error,
        ),
      );
    }

    const validated = DiscoveredCompanyListResponseSchema.safeParse(parsed);

    if (!validated.success) {
      return err(
        new DiscoveryError(
          "DISCOVERY_FAILED",
          validated.error.issues.map((issue) => issue.message).join("; "),
          validated.error,
        ),
      );
    }

    const candidates: RawDiscoveryCandidate[] = validated.data.companies.map((company) => ({
      companyName: company.companyName,
      website: company.website,
      source: DISCOVERY_SOURCE,
      confidence: DEFAULT_CONFIDENCE,
    }));

    const deduplicated = this.deduplicator.deduplicate(candidates);

    if (deduplicated.length === 0) {
      aiLogger.warn("CompanyDiscoveryAgent found no companies after deduplication", {
        rawCount: validated.data.companies.length,
        limit,
      });
    }

    return ok(
      deduplicated.slice(0, limit).map((candidate) => ({
        companyName: candidate.companyName,
        website: candidate.website,
      })),
    );
  }
}

type CompanyDiscoveryInputValidated = {
  query: string;
  industry?: string;
  location?: string;
  limit: number;
};
