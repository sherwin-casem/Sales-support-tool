import type { Agent } from "@/agents/base/agent.interface.js";
import { PromptLoader } from "@/agents/shared/prompt-loader.js";
import type { OpenAIClientPort } from "@/lib/config/openai.client.js";
import type { ScoringWeights } from "@/types/agents/lead-scoring.types.js";
import {
  LEAD_SCORE_EXPLANATION_JSON_SCHEMA,
  LeadScoreExplanationSchema,
  LeadScoreOutputSchema,
  LeadScoringInputSchema,
} from "@/lib/validations/lead-scoring.schema.js";
import { err, ok, type Result } from "@/lib/utils/result.js";
import { AgentError } from "@/types/agents/agent-error.types.js";
import {
  LEAD_SCORING_PROMPT_VERSION,
  type LeadScoreOutput,
  type LeadScoringInput,
} from "@/types/agents/lead-scoring.types.js";
import { scoreIndustryFit } from "@/services/domain/scoring/industry-fit.scorer.js";
import { scoreSizeFit } from "@/services/domain/scoring/size-fit.scorer.js";
import { scoreBusinessMaturity } from "@/services/domain/scoring/business-maturity.scorer.js";
import { scoreGrowthIndicators } from "@/services/domain/scoring/growth-indicators.scorer.js";
import {
  aggregateDeterministicScore,
  buildFallbackExplanation,
} from "@/services/domain/scoring/score-aggregator.js";
import { aiLogger } from "@/lib/logging/logger.js";

const SYSTEM_PROMPT_PATH = "scoring/lead-scoring.system.md";
const USER_PROMPT_PATH = "scoring/lead-scoring.user.md";
const SCHEMA_NAME = "lead_score_explanation";
const MAX_ATTEMPTS = 2;

export interface LeadScoringAgentOptions {
  model: string;
  promptLoader?: PromptLoader;
  maxAttempts?: number;
  weights?: Partial<ScoringWeights>;
}

export class LeadScoringAgent
  implements Agent<LeadScoringInput, LeadScoreOutput>
{
  private readonly promptLoader: PromptLoader;
  private readonly maxAttempts: number;
  private readonly weights?: Partial<ScoringWeights>;

  constructor(
    private readonly openai: OpenAIClientPort,
    private readonly options: LeadScoringAgentOptions,
  ) {
    this.promptLoader = options.promptLoader ?? new PromptLoader();
    this.maxAttempts = options.maxAttempts ?? MAX_ATTEMPTS;
    this.weights = options.weights;
  }

  async execute(
    input: LeadScoringInput,
  ): Promise<Result<LeadScoreOutput, AgentError>> {
    const parsedInput = LeadScoringInputSchema.safeParse(input);

    if (!parsedInput.success) {
      return err(
        new AgentError(
          "INVALID_INPUT",
          parsedInput.error.issues.map((issue) => issue.message).join("; "),
          parsedInput.error,
        ),
      );
    }

    const { profile, criteria, profileCompleteness } = parsedInput.data;

    const aggregated = aggregateDeterministicScore({
      industryFit: scoreIndustryFit(criteria.industry, profile.industry),
      sizeFit: scoreSizeFit(criteria.employeeRange, profile.estimatedCompanySize),
      businessMaturity: scoreBusinessMaturity(profile, profileCompleteness),
      growthIndicators: scoreGrowthIndicators(profile),
      profileCompleteness,
      weights: this.weights,
    });

    const explanationResult = await this.generateExplanation(
      parsedInput.data,
      aggregated.score,
      aggregated.confidence,
      aggregated.breakdown,
    );

    const explanation = explanationResult.ok
      ? explanationResult.value
      : buildFallbackExplanation(profile.companyName, aggregated);

    if (!explanationResult.ok) {
      aiLogger.warn("LeadScoringAgent using fallback explanation", {
        companyId: parsedInput.data.companyId,
        code: explanationResult.error.code,
      });
    }

    const output = LeadScoreOutputSchema.safeParse({
      score: aggregated.score,
      confidence: aggregated.confidence,
      explanation,
      breakdown: aggregated.breakdown,
    });

    if (!output.success) {
      return err(
        new AgentError(
          "VALIDATION_ERROR",
          output.error.issues.map((issue) => issue.message).join("; "),
          output.error,
        ),
      );
    }

    return ok(output.data);
  }

  private async generateExplanation(
    input: LeadScoringInput,
    totalScore: number,
    confidence: number,
    breakdown: LeadScoreOutput["breakdown"],
  ): Promise<Result<string, AgentError>> {
    let lastError: AgentError | undefined;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      const completionResult = await this.requestExplanationCompletion(
        input,
        totalScore,
        confidence,
        breakdown,
      );

      if (!completionResult.ok) {
        lastError = completionResult.error;

        if (attempt === this.maxAttempts) {
          return err(completionResult.error);
        }

        continue;
      }

      const validated = this.validateExplanation(completionResult.value);

      if (validated.ok) {
        return validated;
      }

      lastError = validated.error;

      if (attempt === this.maxAttempts) {
        return err(validated.error);
      }
    }

    return err(
      lastError ??
        new AgentError("VALIDATION_ERROR", "Failed to generate lead score explanation"),
    );
  }

  private async requestExplanationCompletion(
    input: LeadScoringInput,
    totalScore: number,
    confidence: number,
    breakdown: LeadScoreOutput["breakdown"],
  ): Promise<Result<string, AgentError>> {
    try {
      const [systemPrompt, userPrompt] = await Promise.all([
        this.promptLoader.load(SYSTEM_PROMPT_PATH),
        this.promptLoader.loadTemplate(USER_PROMPT_PATH, {
          criteriaIndustry: input.criteria.industry,
          criteriaLocation: input.criteria.location,
          criteriaEmployeeRange: input.criteria.employeeRange,
          profileJson: JSON.stringify(input.profile, null, 2),
          totalScore: totalScore.toFixed(2),
          confidence: confidence.toFixed(3),
          industryFitScore: breakdown.industryFit.score.toString(),
          industryFitRationale: breakdown.industryFit.rationale,
          sizeFitScore: breakdown.sizeFit.score.toString(),
          sizeFitRationale: breakdown.sizeFit.rationale,
          maturityScore: breakdown.businessMaturity.score.toString(),
          maturityRationale: breakdown.businessMaturity.rationale,
          growthScore: breakdown.growthIndicators.score.toString(),
          growthRationale: breakdown.growthIndicators.rationale,
        }),
      ]);

      const content = await this.openai.createStructuredCompletion({
        model: this.options.model,
        temperature: 0,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        schemaName: SCHEMA_NAME,
        schema: LEAD_SCORE_EXPLANATION_JSON_SCHEMA,
      });

      if (!content.trim()) {
        return err(new AgentError("EMPTY_RESPONSE", "OpenAI returned empty content"));
      }

      return ok(content);
    } catch (error) {
      return err(
        new AgentError(
          "OPENAI_ERROR",
          error instanceof Error ? error.message : "OpenAI request failed",
          error,
        ),
      );
    }
  }

  private validateExplanation(raw: string): Result<string, AgentError> {
    let json: unknown;

    try {
      json = JSON.parse(raw);
    } catch (error) {
      return err(
        new AgentError(
          "PARSE_ERROR",
          "OpenAI explanation response was not valid JSON",
          error,
        ),
      );
    }

    const validated = LeadScoreExplanationSchema.safeParse(json);

    if (!validated.success) {
      return err(
        new AgentError(
          "VALIDATION_ERROR",
          validated.error.issues.map((issue) => issue.message).join("; "),
          validated.error,
        ),
      );
    }

    return ok(validated.data.explanation);
  }
}

export function getDefaultLeadScoringPromptVersion(): string {
  return LEAD_SCORING_PROMPT_VERSION;
}
