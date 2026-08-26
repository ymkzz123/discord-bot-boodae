import { BrowserHttpClient } from "../src/scraping/browser-http-client.js";
import { CompositeSearchProvider } from "../src/search/composite-search-provider.js";
import { BingHtmlEngine } from "../src/search/engines/bing-engine.js";
import { DuckDuckGoHtmlEngine } from "../src/search/engines/duckduckgo-engine.js";
import { NaverHtmlEngine } from "../src/search/engines/naver-engine.js";

const query = process.argv.slice(2).join(" ").trim();
if (!query) {
  console.error("사용법: npm run search:smoke -- 검색어");
  process.exitCode = 1;
} else {
  const http = new BrowserHttpClient();
  const provider = new CompositeSearchProvider(
    [
      new DuckDuckGoHtmlEngine(http),
      new NaverHtmlEngine(http),
      new BingHtmlEngine(http),
    ],
    30_000,
  );

  const results = await provider.search(query, { limit: 5 });
  console.log(JSON.stringify({
    query,
    resultCount: results.length,
    results: results.map(({ title, url, providerId }) => ({ title, url, providerId })),
  }, null, 2));
}
