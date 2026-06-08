import { LlmReadyContentSchema, TextCleaningInputSchema } from "@/lib/validations/text-cleaning.schema.js";
import { logger } from "@/lib/logging/logger.js";
import { err, ok, type Result } from "@/lib/utils/result.js";
import {
  TextCleaningService,
  type TextCleaningOptions,
} from "@/services/domain/content/text-cleaning.service.js";
import type { LlmReadyContent, TextCleaningInput } from "@/types/content/text-cleaning.types.js";

export type TextCleaningErrorCode = "INVALID_INPUT" | "CLEANING_FAILED";

export class TextCleaningError extends Error {
  readonly code: TextCleaningErrorCode;
  readonly cause?: unknown;

  constructor(code: TextCleaningErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "TextCleaningError";
    this.code = code;
    this.cause = cause;
  }
}

export interface TextCleaningPort {
  clean(
    input: TextCleaningInput,
    options?: TextCleaningOptions,
  ): Result<LlmReadyContent, TextCleaningError>;
}

export class TextCleaningServiceFacade implements TextCleaningPort {
  constructor(private readonly cleaner: TextCleaningService) {}

  clean(
    input: TextCleaningInput,
    options?: TextCleaningOptions,
  ): Result<LlmReadyContent, TextCleaningError> {
    const parsedInput = TextCleaningInputSchema.safeParse(input);

    if (!parsedInput.success) {
      return err(
        new TextCleaningError(
          "INVALID_INPUT",
          parsedInput.error.issues.map((issue) => issue.message).join("; "),
          parsedInput.error,
        ),
      );
    }

    const startedAt = Date.now();

    logger.info("TextCleaningService.clean started", {
      url: parsedInput.data.url,
      pagePath: parsedInput.data.pagePath,
      inputBytes: Buffer.byteLength(parsedInput.data.html, "utf8"),
    });

    try {
      const cleaned = this.cleaner.clean(parsedInput.data, options);
      const validated = LlmReadyContentSchema.safeParse(cleaned);

      if (!validated.success) {
        return err(
          new TextCleaningError(
            "CLEANING_FAILED",
            validated.error.issues.map((issue) => issue.message).join("; "),
            validated.error,
          ),
        );
      }

      logger.info("TextCleaningService.clean completed", {
        url: parsedInput.data.url,
        pagePath: parsedInput.data.pagePath,
        durationMs: Date.now() - startedAt,
        outputChars: validated.data.stats.outputChars,
        compressionRatio: validated.data.stats.compressionRatio,
        blocksRemoved: validated.data.stats.blocksRemoved,
        lowQuality: validated.data.stats.lowQuality,
      });

      return ok(validated.data);
    } catch (error) {
      logger.error("TextCleaningService.clean failed", {
        url: parsedInput.data.url,
        pagePath: parsedInput.data.pagePath,
        durationMs: Date.now() - startedAt,
        message: error instanceof Error ? error.message : "Unknown error",
      });

      return err(
        new TextCleaningError(
          "CLEANING_FAILED",
          error instanceof Error ? error.message : "Text cleaning failed",
          error,
        ),
      );
    }
  }
}

let cachedFacade: TextCleaningServiceFacade | undefined;

export function createTextCleaningService(): TextCleaningServiceFacade {
  return new TextCleaningServiceFacade(new TextCleaningService());
}

export function getTextCleaningService(): TextCleaningServiceFacade {
  if (!cachedFacade) {
    cachedFacade = createTextCleaningService();
  }

  return cachedFacade;
}

export function resetTextCleaningServiceCache(): void {
  cachedFacade = undefined;
}

/**
 * Cleans multiple pages and aggregates them into one LLM-ready document.
 */
export function aggregateLlmReadyPages(pages: LlmReadyContent[], maxTotalChars = 24_000): string {
  const sections = pages.map((page) => page.body);
  let combined = sections.join("\n\n");

  if (combined.length <= maxTotalChars) {
    return combined;
  }

  const priorityOrder = ["/", "/about", "/company", "/contact", "/careers"];
  const ordered = [...pages].sort((left, right) => {
    const leftIndex = priorityOrder.indexOf(left.source.pagePath);
    const rightIndex = priorityOrder.indexOf(right.source.pagePath);
    return (leftIndex === -1 ? 99 : leftIndex) - (rightIndex === -1 ? 99 : rightIndex);
  });

  combined = "";
  for (const page of ordered) {
    if (combined.length + page.body.length + 2 > maxTotalChars) {
      break;
    }

    combined = combined ? `${combined}\n\n${page.body}` : page.body;
  }

  return combined;
}
