export interface RetryOptions {
  maxAttempts: number;
  initialDelayMs: number;
  backoffFactor?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

const DEFAULT_BACKOFF = 2;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const backoffFactor = options.backoffFactor ?? DEFAULT_BACKOFF;
  let delayMs = options.initialDelayMs;
  let lastError: unknown;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === options.maxAttempts) {
        break;
      }

      if (options.shouldRetry && !options.shouldRetry(error, attempt)) {
        break;
      }

      await sleep(delayMs);
      delayMs *= backoffFactor;
    }
  }

  throw lastError;
}

export function isRetryableHttpStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}
