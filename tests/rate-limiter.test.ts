import { describe, expect, it } from "vitest";

import { FixedWindowRateLimiter } from "../src/security/rate-limiter.js";

describe("FixedWindowRateLimiter", () => {
  it("blocks requests over the limit until the window resets", () => {
    let now = 0;
    const limiter = new FixedWindowRateLimiter(2, 10_000, () => now);

    expect(limiter.consume("user")).toEqual({ allowed: true, remaining: 1 });
    expect(limiter.consume("user")).toEqual({ allowed: true, remaining: 0 });
    expect(limiter.consume("user")).toEqual({ allowed: false, retryAfterSeconds: 10 });

    now = 10_000;
    expect(limiter.consume("user")).toEqual({ allowed: true, remaining: 1 });
  });

  it("sweeps expired windows", () => {
    let now = 0;
    const limiter = new FixedWindowRateLimiter(1, 100, () => now);
    limiter.consume("user");

    now = 100;
    expect(limiter.sweep()).toBe(1);
  });
});
