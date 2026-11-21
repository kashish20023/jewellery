/**
 * Anti-Spam Sliding-Window Rate Limiter
 * Protects public enquiry and appointment booking endpoints from spam and automated floods.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up stale records periodically
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      record.timestamps = record.timestamps.filter((t) => now - t < 600_000);
      if (record.timestamps.length === 0) {
        rateLimitStore.delete(key);
      }
    }
  }, 300_000);
}

export interface RateLimitOptions {
  limit?: number; // Maximum allowed requests
  windowMs?: number; // Time window in milliseconds (default 10 minutes = 600,000ms)
}

/**
 * Checks whether an identifier (e.g. IP address) exceeds the rate limit.
 * Returns { isLimited: boolean, remaining: number, resetTimeMs: number }
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): { isLimited: boolean; remaining: number; resetTimeMs: number } {
  const limit = options.limit ?? 5;
  const windowMs = options.windowMs ?? 600_000;
  const now = Date.now();

  const record = rateLimitStore.get(identifier) || { timestamps: [] };
  // Keep only timestamps within the current sliding window
  const activeTimestamps = record.timestamps.filter((t) => now - t < windowMs);

  if (activeTimestamps.length >= limit) {
    const oldest = activeTimestamps[0];
    const resetTimeMs = oldest + windowMs - now;
    return {
      isLimited: true,
      remaining: 0,
      resetTimeMs: Math.max(0, resetTimeMs),
    };
  }

  activeTimestamps.push(now);
  rateLimitStore.set(identifier, { timestamps: activeTimestamps });

  return {
    isLimited: false,
    remaining: limit - activeTimestamps.length,
    resetTimeMs: windowMs,
  };
}

/**
 * Resets rate limit for a specific identifier (useful for tests).
 */
export function resetRateLimit(identifier?: string): void {
  if (identifier) {
    rateLimitStore.delete(identifier);
  } else {
    rateLimitStore.clear();
  }
}

