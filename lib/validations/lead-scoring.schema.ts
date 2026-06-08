import { z } from "zod";
import { ExtractedCompanySchema } from "@/lib/validations/company-extraction.schema.js";
import { ParsedQuerySchema } from "@/lib/validations/query-parser.schema.js";
import { resolveScoringWeights } from "@/lib/config/scoring.config.js";
import type { ScoringWeights } from "@/types/agents/lead-scoring.types.js";

const factorScoreSchema = z.object({
  score: z.number().min(0).max(100),
  weight: z.number().min(0).max(1),
  weightedScore: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  rationale: z.string().trim().min(1).max(500),
  signals: z.array(z.string().trim().min(1).max(200)).max(20),
});

export const ScoreBreakdownSchema = z.object({
  industryFit: factorScoreSchema,
  sizeFit: factorScoreSchema,
  businessMaturity: factorScoreSchema,
  growthIndicators: factorScoreSchema,
});

export const LeadScoreOutputSchema = z.object({
  score: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  explanation: z.string().trim().min(20).max(800),
  breakdown: ScoreBreakdownSchema,
});

export const LeadScoringInputSchema = z.object({
  profile: ExtractedCompanySchema,
  criteria: ParsedQuerySchema,
  companyId: z.string().uuid("companyId must be a valid UUID"),
  searchResultId: z.string().uuid("searchResultId must be a valid UUID"),
  searchJobId: z.string().uuid("searchJobId must be a valid UUID"),
  profileCompleteness: z.number().min(0).max(1).optional(),
  promptVersion: z.string().min(1).max(20).optional(),
});

export const ScoringWeightsSchema = z
  .object({
    industryFit: z.number().min(0),
    sizeFit: z.number().min(0),
    businessMaturity: z.number().min(0),
    growthIndicators: z.number().min(0),
  })
  .refine(
    (weights) => {
      const sum =
        weights.industryFit +
        weights.sizeFit +
        weights.businessMaturity +
        weights.growthIndicators;

      return sum > 0;
    },
    { message: "At least one scoring weight must be greater than zero" },
  )
  .transform((weights) => resolveScoringWeights(weights));

export const LEAD_SCORE_EXPLANATION_JSON_SCHEMA = {
  type: "object",
  properties: {
    explanation: {
      type: "string",
      description:
        "2-4 sentence sales-ready summary referencing score and key fit factors",
    },
  },
  required: ["explanation"],
  additionalProperties: false,
} as const;

export const LeadScoreExplanationSchema = z.object({
  explanation: z.string().trim().min(20).max(800),
});

export type LeadScoreOutputValidated = z.infer<typeof LeadScoreOutputSchema>;

export function validateScoringWeights(weights: ScoringWeights): ScoringWeights {
  return ScoringWeightsSchema.parse(weights);
}
