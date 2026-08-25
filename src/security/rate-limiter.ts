interface WindowState {
  count: number;
  resetsAt: number;
}

export type RateLimitResult =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterSeconds: number };

export class FixedWindowRateLimiter {
  readonly #windows = new Map<string, WindowState>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  consume(key: string): RateLimitResult {
    const now = this.now();
    const existing = this.#windows.get(key);

    if (!existing || existing.resetsAt <= now) {
      this.#windows.set(key, { count: 1, resetsAt: now + this.windowMs });
      return { allowed: true, remaining: this.limit - 1 };
    }

    if (existing.count >= this.limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((existing.resetsAt - now) / 1_000)),
      };
    }

    existing.count += 1;
    return { allowed: true, remaining: this.limit - existing.count };
  }

  sweep(): number {
    const now = this.now();
    let removed = 0;

    for (const [key, state] of this.#windows) {
      if (state.resetsAt <= now) {
        this.#windows.delete(key);
        removed += 1;
      }
    }

    return removed;
  }
}
