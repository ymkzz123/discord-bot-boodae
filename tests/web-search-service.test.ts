import { describe, expect, it, vi } from "vitest";

import { WebSearchService } from "../src/search/web-search-service.js";

describe("WebSearchService", () => {
  it("collects results, generates an answer, and appends sources", async () => {
    const results = [
      { title: "공식 문서", url: "https://example.com", snippet: "설명" },
    ];
    const provider = { id: "test", search: vi.fn().mockResolvedValue(results) };
    const generator = { generate: vi.fn().mockResolvedValue("요약 [1]") };
    const service = new WebSearchService(provider, generator, 5);

    await expect(service.search("질문")).resolves.toEqual({
      markdown: "요약 [1]\n\n**출처**\n1. [공식 문서](https://example.com)",
      sourceCount: 1,
    });
    expect(provider.search).toHaveBeenCalledWith("질문", { limit: 5 });
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
