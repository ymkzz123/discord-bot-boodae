import { describe, expect, it, vi } from "vitest";

import { AsyncTtlCache } from "../src/lib/async-ttl-cache.js";

describe("AsyncTtlCache", () => {
  it("shares an in-flight value and reloads it after expiration", async () => {
    let now = 1_000;
    const loader = vi.fn().mockResolvedValueOnce("first").mockResolvedValueOnce("second");
    const cache = new AsyncTtlCache<string>(100, () => now);

    await expect(Promise.all([
      cache.getOrLoad("key", loader),
      cache.getOrLoad("key", loader),
    ])).resolves.toEqual(["first", "first"]);
    expect(loader).toHaveBeenCalledTimes(1);

    now = 1_101;
    await expect(cache.getOrLoad("key", loader)).resolves.toBe("second");
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("does not cache a rejected request", async () => {
    const loader = vi.fn()
      .mockRejectedValueOnce(new Error("temporary"))
      .mockResolvedValueOnce("recovered");
    const cache = new AsyncTtlCache<string>(100);

    await expect(cache.getOrLoad("key", loader)).rejects.toThrow("temporary");
    await expect(cache.getOrLoad("key", loader)).resolves.toBe("recovered");
  });
});
