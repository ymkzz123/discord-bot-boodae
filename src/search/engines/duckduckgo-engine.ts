import type { BrowserHttpClient } from "../../scraping/browser-http-client.js";
import type { SearchResult } from "../types.js";
import { externalHttpUrl, normalizeSearchText, withDocument } from "./html-utils.js";
import type { HtmlSearchEngine, SearchAttemptOutcome, SearchEngineResponse } from "./types.js";

const ENDPOINT = "https://html.duckduckgo.com/html/";

function unwrapResultUrl(value: string | null): string | undefined {
  const url = externalHttpUrl(value, "https://html.duckduckgo.com");
  if (!url) return undefined;

  const redirected = new URL(url).searchParams.get("uddg");
  return redirected ? externalHttpUrl(redirected) : url;
}

export class DuckDuckGoHtmlEngine implements HtmlSearchEngine {
  readonly id = "duckduckgo";

  constructor(private readonly http: BrowserHttpClient) {}

  async search(query: string, limit: number, signal: AbortSignal): Promise<SearchEngineResponse> {
    const startedAt = Date.now();
    const url = new URL(ENDPOINT);
    url.searchParams.set("q", query);
    url.searchParams.set("kl", "kr-ko");
    const response = await this.http.getHtml(url, { signal });
    let outcome: SearchAttemptOutcome = response.ok ? "empty" : "http_error";
    let results: SearchResult[] = [];

    if (response.ok) {
      const parsed = withDocument(response.html, (document) => {
        if (document.querySelector("#anomaly-modal, .anomaly-modal")) {
          outcome = "blocked";
          return [];
        }

        const values: SearchResult[] = [];
        const seen = new Set<string>();
        for (const node of document.querySelectorAll(".result")) {
          if (values.length >= limit) break;
          const anchor = node.querySelector(".result__title a.result__a, a.result__a");
          const title = normalizeSearchText(anchor?.textContent);
          const resultUrl = unwrapResultUrl(anchor?.getAttribute("href") ?? null);
          if (!title || !resultUrl || seen.has(resultUrl)) continue;

          seen.add(resultUrl);
          values.push({
            title,
            url: resultUrl,
            snippet: normalizeSearchText(node.querySelector(".result__snippet")?.textContent),
            providerId: this.id,
          });
        }
        return values;
      });
      results = parsed;
      if (results.length > 0) outcome = "success";
    }

    return {
      results,
      diagnostic: {
        engine: this.id,
        outcome,
        status: response.status,
        resultCount: results.length,
        durationMs: Date.now() - startedAt,
      },
    };
  }
}
