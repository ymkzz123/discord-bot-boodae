import type { BrowserHttpClient } from "../../scraping/browser-http-client.js";
import type { SearchResult } from "../types.js";
import { externalHttpUrl, normalizeSearchText, withDocument } from "./html-utils.js";
import type { HtmlSearchEngine, SearchEngineResponse } from "./types.js";

const ENDPOINT = "https://search.naver.com/search.naver";
const RESULT_CONTAINER = [
  "[class*='sds-comps-']",
  "[class*='type_height_']",
  "[class*='area_video']",
  "[class*='area_dsc']",
].join(", ");

export class NaverHtmlEngine implements HtmlSearchEngine {
  readonly id = "naver";

  constructor(private readonly http: BrowserHttpClient) {}

  async search(query: string, limit: number, signal: AbortSignal): Promise<SearchEngineResponse> {
    const startedAt = Date.now();
    const url = new URL(ENDPOINT);
    url.searchParams.set("where", "nexearch");
    url.searchParams.set("query", query);
    const response = await this.http.getHtml(url, { signal });
    let results: SearchResult[] = [];

    if (response.ok) {
      results = withDocument(response.html, (document) => {
        const values: SearchResult[] = [];
        const seen = new Set<string>();

        for (const anchor of document.querySelectorAll("a[href]")) {
          if (values.length >= limit) break;
          const resultUrl = externalHttpUrl(anchor.getAttribute("href"));
          if (!resultUrl || seen.has(resultUrl)) continue;

          const hostname = new URL(resultUrl).hostname.toLowerCase();
          if (hostname.endsWith("naver.com") || hostname.endsWith("pstatic.net")) continue;

          const className = normalizeSearchText(anchor.className);
          const parentClassName = normalizeSearchText(anchor.parentElement?.className);
          if (!/(?:fender-ui_|_cav_trigger|sds-comps-|type_height_)/u.test(
            `${className} ${parentClassName}`,
          )) {
            continue;
          }

          const title = normalizeSearchText(anchor.textContent).replace(/\s*새 창 열림$/u, "");
          if (title.length < 2 || title === "캐시 열기") continue;

          const container = anchor.closest(RESULT_CONTAINER) ?? anchor.parentElement;
          const containerText = normalizeSearchText(container?.textContent).replace(/\s*캐시 열기/gu, "");
          const snippet = containerText === title ? "" : containerText.slice(0, 800);

          seen.add(resultUrl);
          values.push({ title, url: resultUrl, snippet, providerId: this.id });
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
