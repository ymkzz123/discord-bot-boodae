import { describe, expect, it, vi } from "vitest";

import { WebSearchService } from "../src/search/web-search-service.js";

describe("WebSearchService", () => {
  it("collects results and returns the generated answer without a source list", async () => {
    const results = [
      { title: "공식 문서", url: "https://example.com", snippet: "설명" },
    ];
    const provider = { id: "test", search: vi.fn().mockResolvedValue(results) };
    const generator = { generate: vi.fn().mockResolvedValue("자연스러운 요약") };
    const service = new WebSearchService(provider, generator, 5);

    await expect(service.search("질문")).resolves.toEqual({
      markdown: "자연스러운 요약",
      sourceCount: 1,
    });
    expect(provider.search).toHaveBeenCalledWith("질문", { limit: 5 });
    expect(generator.generate).toHaveBeenCalledWith("질문", results, undefined);
  });

  it("reports an empty result set clearly", async () => {
    const provider = { id: "test", search: vi.fn().mockResolvedValue([]) };
    const generator = { generate: vi.fn() };
    const service = new WebSearchService(provider, generator, 5);

    await expect(service.search("질문")).rejects.toMatchObject({
      code: "SEARCH_NO_RESULTS",
    });
    expect(generator.generate).not.toHaveBeenCalled();
  });
});
