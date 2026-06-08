export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

interface RateLimitBucket {
  count: number;
  windowStartedAt: number;
}

export class SlidingWindowRateLimiter {
  private readonly buckets = new Map<string, RateLimitBucket>();

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number,
  ) {}

  consume(key: string, now = Date.now()): RateLimitResult {
    const bucket = this.buckets.get(key);
    const resetAt = (bucket?.windowStartedAt ?? now) + this.windowMs;

    if (!bucket || now - bucket.windowStartedAt >= this.windowMs) {
      this.buckets.set(key, { count: 1, windowStartedAt: now });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetAt: now + this.windowMs,
        retryAfterSeconds: 0,
      };
    }

    if (bucket.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
      };
    }

    bucket.count += 1;
    this.buckets.set(key, bucket);

    return {
      allowed: true,
      remaining: this.maxRequests - bucket.count,
      resetAt,
      retryAfterSeconds: 0,
    };
  }
}

const limiters = new Map<string, SlidingWindowRateLimiter>();

export function getRateLimiter(name: string, maxRequests: number, windowMs: number): SlidingWindowRateLimiter {
  const cacheKey = `${name}:${maxRequests}:${windowMs}`;
  const existing = limiters.get(cacheKey);

  if (existing) {
    return existing;
  }

  const limiter = new SlidingWindowRateLimiter(maxRequests, windowMs);
  limiters.set(cacheKey, limiter);
  return limiter;
}

export function resetRateLimitersForTests(): void {
  limiters.clear();
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}
