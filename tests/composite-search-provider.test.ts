import { describe, expect, it, vi } from "vitest";

import { CompositeSearchProvider } from "../src/search/composite-search-provider.js";
import type { HtmlSearchEngine, SearchAttemptOutcome } from "../src/search/engines/types.js";

function engine(
  id: string,
  outcome: SearchAttemptOutcome,
  results: Array<{ title: string; url: string; snippet: string; providerId: string }> = [],
): HtmlSearchEngine {
  return {
    id,
    search: vi.fn().mockResolvedValue({
      results,
      diagnostic: {
        engine: id,
        outcome,
        status: outcome === "blocked" ? 202 : 200,
        resultCount: results.length,
        durationMs: 1,
      },
    }),
  };
}

describe("CompositeSearchProvider", () => {
  it("tries engines in order and fills the requested result count", async () => {
    const duck = engine("duckduckgo", "blocked");
    const naver = engine("naver", "success", [
      { title: "Naver", url: "https://example.com/a", snippet: "", providerId: "naver" },
    ]);
    const bing = engine("bing", "success", [
      { title: "Bing", url: "https://example.com/b", snippet: "", providerId: "bing" },
    ]);
    const provider = new CompositeSearchProvider([duck, naver, bing], 10_000);

    await expect(provider.search("검색어", { limit: 2 })).resolves.toHaveLength(2);
    expect(duck.search).toHaveBeenCalledOnce();
    expect(naver.search).toHaveBeenCalledOnce();
    expect(bing.search).toHaveBeenCalledOnce();
  });

  it("includes provider diagnostics when every engine is blocked or fails", async () => {
    const provider = new CompositeSearchProvider(
      [engine("duckduckgo", "blocked"), engine("naver", "http_error")],
      10_000,
    );

    await expect(provider.search("검색어", { limit: 5 })).rejects.toMatchObject({
      code: "SEARCH_PROVIDER",
      message: expect.stringContaining("duckduckgo:blocked:http202"),
    });
  });
});
