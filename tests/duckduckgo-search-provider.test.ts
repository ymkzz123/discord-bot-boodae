import { describe, expect, it, vi } from "vitest";

import {
  DuckDuckGoSearchProvider,
  parseDuckDuckGoResults,
  parseNaverResults,
} from "../src/search/duckduckgo-search-provider.js";

const duckDuckGoHtml = `
  <div class="result">
    <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fdocs">Example &amp; Docs</a>
    <a class="result__snippet">Official <b>documentation</b>.</a>
  </div>
`;

const naverHtml = `
  <a class="fender-ui_result title" href="https://example.org/article">네이버 대체 검색 결과 새 창 열림</a>
  <a class="fender-ui_result title" href="https://search.naver.com/internal">내부 결과</a>
`;

describe("HTML search result parsers", () => {
  it("extracts DuckDuckGo results", () => {
    expect(parseDuckDuckGoResults(duckDuckGoHtml, 5)).toEqual([
      {
        title: "Example & Docs",
        url: "https://example.com/docs",
        snippet: "Official documentation .",
      },
    ]);
  });

  it("extracts external Naver results and ignores Naver links", () => {
    expect(parseNaverResults(naverHtml, 5)).toEqual([
      {
        title: "네이버 대체 검색 결과",
        url: "https://example.org/article",
        snippet: "",
      },
    ]);
  });
});

describe("DuckDuckGoSearchProvider", () => {
  it("uses a browser-style GET request and returns DuckDuckGo results first", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(duckDuckGoHtml, { status: 200 }));
    const provider = new DuckDuckGoSearchProvider(
      10_000,
      fetcher as unknown as typeof fetch,
    );

    await expect(provider.search("류현진", { limit: 5 })).resolves.toHaveLength(1);

    const [url, options] = fetcher.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toContain(`q=${encodeURIComponent("류현진")}`);
    expect(url.toString()).toContain("kl=kr-ko");
    expect(options.method).toBeUndefined();
    expect(options.headers).toMatchObject({
      "accept-language": expect.stringContaining("ko-KR"),
      "user-agent": expect.stringContaining("Mozilla/5.0"),
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("falls back to Naver when DuckDuckGo returns no results", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response("<html>anomaly page</html>", { status: 202 }))
      .mockResolvedValueOnce(new Response(naverHtml, { status: 200 }));
    const provider = new DuckDuckGoSearchProvider(
      10_000,
      fetcher as unknown as typeof fetch,
    );

    await expect(provider.search("드래곤빌리지", { limit: 5 })).resolves.toEqual([
      {
        title: "네이버 대체 검색 결과",
        url: "https://example.org/article",
        snippet: "",
      },
    ]);

    const [fallbackUrl] = fetcher.mock.calls[1] as [URL, RequestInit];
    expect(fallbackUrl.hostname).toBe("search.naver.com");
    expect(fallbackUrl.searchParams.get("query")).toBe("드래곤빌리지");
  });
});
