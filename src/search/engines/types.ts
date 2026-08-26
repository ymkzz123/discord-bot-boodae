import type { SearchResult } from "../types.js";

export type SearchAttemptOutcome = "success" | "empty" | "blocked" | "http_error";

export interface SearchAttemptDiagnostic {
  engine: string;
  outcome: SearchAttemptOutcome;
  status: number;
  resultCount: number;
  durationMs: number;
}

export interface SearchEngineResponse {
  results: SearchResult[];
  diagnostic: SearchAttemptDiagnostic;
}

export interface HtmlSearchEngine {
  readonly id: string;
  search(query: string, limit: number, signal: AbortSignal): Promise<SearchEngineResponse>;
}
