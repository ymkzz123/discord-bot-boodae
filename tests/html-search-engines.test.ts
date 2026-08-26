import { describe, expect, it, vi } from "vitest";

import { BrowserHttpClient } from "../src/scraping/browser-http-client.js";
import { BingHtmlEngine } from "../src/search/engines/bing-engine.js";
import { DuckDuckGoHtmlEngine } from "../src/search/engines/duckduckgo-engine.js";
import { NaverHtmlEngine } from "../src/search/engines/naver-engine.js";

function clientWith(html: string, status = 200) {
  const fetcher = vi.fn().mockResolvedValue(new Response(html, { status }));
  return {
    client: new BrowserHttpClient(fetcher as unknown as typeof fetch),
    fetcher,
  };
}

describe("HTML search engines", () => {
  it("parses DuckDuckGo DOM results and unwraps redirect URLs", async () => {
    const { client, fetcher } = clientWith(`
      <div class="result">
        <div class="result__title">
          <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fdocs">Example Docs</a>
        </div>
        <a class="result__snippet">Official documentation.</a>
      </div>
    `);
    const engine = new DuckDuckGoHtmlEngine(client);
    const response = await engine.search("류현진", 5, AbortSignal.timeout(10_000));

    expect(response.results).toEqual([
      {
        title: "Example Docs",
        url: "https://example.com/docs",
        snippet: "Official documentation.",
        providerId: "duckduckgo",
      },
    ]);
    expect(response.diagnostic.outcome).toBe("success");
    const [url, options] = fetcher.mock.calls[0] as [URL, RequestInit];
    expect(url.searchParams.get("q")).toBe("류현진");
    expect(options.headers).toMatchObject({ "user-agent": expect.stringContaining("Mozilla/5.0") });
  });

  it("recognizes a DuckDuckGo anomaly page as blocked", async () => {
    const { client } = clientWith(`<div id="anomaly-modal">blocked</div>`, 202);
    const response = await new DuckDuckGoHtmlEngine(client).search(
      "검색어",
      5,
      AbortSignal.timeout(10_000),
    );

    expect(response.results).toEqual([]);
    expect(response.diagnostic).toMatchObject({ outcome: "blocked", status: 202 });
  });

  it("parses external Naver results", async () => {
    const { client } = clientWith(`
      <div class="sds-comps-base-layout">
        <a class="fender-ui_result" href="https://example.org/article">네이버 대체 결과</a>
        <span>검색 결과 설명</span>
      </div>
    `);
    const response = await new NaverHtmlEngine(client).search(
      "드래곤빌리지",
      5,
      AbortSignal.timeout(10_000),
    );

    expect(response.results[0]).toMatchObject({
      title: "네이버 대체 결과",
      url: "https://example.org/article",
      providerId: "naver",
    });
  });

  it("parses Bing algorithmic results", async () => {
    const { client } = clientWith(`
      <ol><li class="b_algo">
        <h2><a href="https://example.net/page">Bing result</a></h2>
        <div class="b_caption"><p>Result summary</p></div>
      </li></ol>
    `);
    const response = await new BingHtmlEngine(client).search(
      "검색어",
      5,
      AbortSignal.timeout(10_000),
    );

    expect(response.results).toEqual([
      {
        title: "Bing result",
        url: "https://example.net/page",
        snippet: "Result summary",
        providerId: "bing",
      },
    ]);
  });
});
