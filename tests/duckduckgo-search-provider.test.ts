import { describe, expect, it } from "vitest";

import { parseDuckDuckGoResults } from "../src/search/duckduckgo-search-provider.js";

describe("parseDuckDuckGoResults", () => {
  it("extracts, decodes, and deduplicates results", () => {
    const html = `
      <div class="result">
        <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fdocs">Example &amp; Docs</a>
        <a class="result__snippet">Official <b>documentation</b>.</a>
      </div>
      <div class="result">
        <a class="result__a" href="https://example.com/docs">Duplicate</a>
        <a class="result__snippet">Duplicate result</a>
      </div>
    `;

    expect(parseDuckDuckGoResults(html, 5)).toEqual([
      {
        title: "Example & Docs",
        url: "https://example.com/docs",
        snippet: "Official documentation .",
      },
    ]);
  });
});
