import type { BrowserHttpClient } from "../../scraping/browser-http-client.js";
import type { SearchResult } from "../types.js";
import { externalHttpUrl, normalizeSearchText, withDocument } from "./html-utils.js";
import type { HtmlSearchEngine, SearchEngineResponse } from "./types.js";

const ENDPOINT = "https://www.bing.com/search";

export class BingHtmlEngine implements HtmlSearchEngine {
  readonly id = "bing";

  constructor(private readonly http: BrowserHttpClient) {}

  async search(query: string, limit: number, signal: AbortSignal): Promise<SearchEngineResponse> {
    const startedAt = Date.now();
    const url = new URL(ENDPOINT);
    url.searchParams.set("q", query);
    url.searchParams.set("setlang", "ko-kr");
    url.searchParams.set("cc", "kr");
    const response = await this.http.getHtml(url, { signal });
    let results: SearchResult[] = [];

    if (response.ok) {
      results = withDocument(response.html, (document) => {
        const values: SearchResult[] = [];
        const seen = new Set<string>();

        for (const node of document.querySelectorAll("li.b_algo")) {
          if (values.length >= limit) break;
          const anchor = node.querySelector("h2 a[href], a[href]");
          const resultUrl = externalHttpUrl(anchor?.getAttribute("href"));
          const title = normalizeSearchText(anchor?.textContent);
          if (!resultUrl || !title || seen.has(resultUrl)) continue;

          seen.add(resultUrl);
          values.push({
            title,
            url: resultUrl,
            snippet: normalizeSearchText(node.querySelector(".b_caption p, .b_lineclamp2")?.textContent),
            providerId: this.id,
          });
        }

        return values;
      });
    }

    return {
      results,
      diagnostic: {
        engine: this.id,
        outcome: response.ok ? (results.length > 0 ? "success" : "empty") : "http_error",
        status: response.status,
        resultCount: results.length,
        durationMs: Date.now() - startedAt,
      },
    };
  }
}
