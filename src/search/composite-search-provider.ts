import { SearchError } from "./search-error.js";
import type { HtmlSearchEngine, SearchAttemptDiagnostic } from "./engines/types.js";
import type { SearchProvider, SearchResult } from "./types.js";

function diagnosticText(diagnostics: readonly SearchAttemptDiagnostic[]): string {
  return diagnostics
    .map(
      (item) =>
        `${item.engine}:${item.outcome}:http${item.status}:results${item.resultCount}:${item.durationMs}ms`,
    )
    .join(",");
}

export class CompositeSearchProvider implements SearchProvider {
  readonly id: string;

  constructor(
    private readonly engines: readonly HtmlSearchEngine[],
    private readonly timeoutMs: number,
  ) {
    if (engines.length === 0) throw new Error("At least one search engine is required");
    this.id = engines.map((engine) => engine.id).join("+");
  }

  async search(query: string, { limit }: { limit: number }): Promise<SearchResult[]> {
    const normalizedQuery = query.replace(/\s+/g, " ").trim();
    if (!normalizedQuery) return [];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const results: SearchResult[] = [];
    const seen = new Set<string>();
    const diagnostics: SearchAttemptDiagnostic[] = [];

    try {
      for (const engine of this.engines) {
        if (results.length >= limit || controller.signal.aborted) break;

        const startedAt = Date.now();
        try {
          const response = await engine.search(
            normalizedQuery,
            limit - results.length,
            controller.signal,
          );
          diagnostics.push(response.diagnostic);

          for (const result of response.results) {
            const key = new URL(result.url).toString();
            if (seen.has(key)) continue;
            seen.add(key);
            results.push(result);
          }
        } catch {
          diagnostics.push({
            engine: engine.id,
            outcome: "http_error",
            status: 0,
            resultCount: 0,
            durationMs: Date.now() - startedAt,
          });
        }
      }
    } finally {
      clearTimeout(timeout);
    }

    if (results.length > 0) return results.slice(0, limit);

    const summary = diagnosticText(diagnostics);
    if (controller.signal.aborted) {
      throw new SearchError("SEARCH_TIMEOUT", `Search pipeline timed out (${summary})`);
    }

    const everyAttemptFailed = diagnostics.every(
      (item) => item.outcome === "blocked" || item.outcome === "http_error",
    );
    throw new SearchError(
      everyAttemptFailed ? "SEARCH_PROVIDER" : "SEARCH_NO_RESULTS",
      `Search pipeline exhausted (${summary})`,
    );
  }
}
