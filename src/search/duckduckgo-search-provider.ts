import { SearchError } from "./search-error.js";
import type { SearchProvider, SearchResult } from "./types.js";

const DUCKDUCKGO_ENDPOINT = "https://html.duckduckgo.com/html/";
const NAVER_ENDPOINT = "https://search.naver.com/search.naver";

const BROWSER_HEADERS = {
  "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
  "user-agent": [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "AppleWebKit/537.36 (KHTML, like Gecko)",
    "Chrome/137.0.0.0 Safari/537.36",
  ].join(" "),
} as const;

function normalizeText(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&(#(?:x[0-9a-f]+|\d+)|[a-z]+);/gi, (_, entity: string) => {
      if (entity.startsWith("#")) {
        const hexadecimal = entity[1]?.toLowerCase() === "x";
        const number = Number.parseInt(
          entity.slice(hexadecimal ? 2 : 1),
          hexadecimal ? 16 : 10,
        );
        return Number.isFinite(number) ? String.fromCodePoint(number) : "";
      }

      return named[entity.toLowerCase()] ?? `&${entity};`;
    })
    .replace(/\s+/g, " ")
    .replace(/\s*새 창 열림\s*$/u, "")
    .trim();
}

function externalUrl(value: string, base?: string): string | undefined {
  try {
    const url = new URL(value, base);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

function resolveDuckDuckGoUrl(value: string): string | undefined {
  const url = externalUrl(value, "https://duckduckgo.com");
  if (!url) return undefined;

  const redirected = new URL(url).searchParams.get("uddg");
  return redirected ? externalUrl(redirected) : url;
}

export function parseDuckDuckGoResults(html: string, limit: number): SearchResult[] {
  const linkPattern = /<a\b[^>]*class=["'][^"']*\bresult__a\b[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const links = [...html.matchAll(linkPattern)];
  const results: SearchResult[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < links.length && results.length < limit; index += 1) {
    const match = links[index];
    const href = match?.[1];
    const titleHtml = match?.[2];
    if (!match || !href || !titleHtml) continue;

    const url = resolveDuckDuckGoUrl(href);
    if (!url || seen.has(url)) continue;

    const sectionEnd = links[index + 1]?.index ?? html.length;
    const section = html.slice((match.index ?? 0) + match[0].length, sectionEnd);
    const snippetHtml = section.match(
      /<(?:a|div)\b[^>]*class=["'][^"']*\bresult__snippet\b[^"']*["'][^>]*>([\s\S]*?)<\/(?:a|div)>/i,
    )?.[1];
    const title = normalizeText(titleHtml);
    const snippet = normalizeText(snippetHtml ?? "");
    if (!title) continue;

    seen.add(url);
    results.push({ title, url, snippet });
  }

  return results;
}

export function parseNaverResults(html: string, limit: number): SearchResult[] {
  const anchorPattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  const results: SearchResult[] = [];
  const seen = new Set<string>();

  for (const match of html.matchAll(anchorPattern)) {
    if (results.length >= limit) break;

    const attributes = match[1] ?? "";
    const href = attributes.match(/\bhref=["']([^"']+)["']/i)?.[1];
    const className = attributes.match(/\bclass=["']([^"']*)["']/i)?.[1] ?? "";
    if (!href || !/(?:fender-ui_|_cav_trigger|sds-comps-|type_height_)/u.test(className)) {
      continue;
    }

    const url = externalUrl(href);
    if (!url || seen.has(url)) continue;

    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.endsWith("naver.com") || hostname.endsWith("pstatic.net")) continue;

    const title = normalizeText(match[2] ?? "");
    if (title.length < 2 || title === "캐시 열기") continue;

    seen.add(url);
    results.push({ title, url, snippet: "" });
  }

  return results;
}

interface SearchAttempt {
  name: string;
  run(): Promise<SearchResult[]>;
}

export class DuckDuckGoSearchProvider implements SearchProvider {
  readonly id = "duckduckgo+naver";

  constructor(
    private readonly timeoutMs: number,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async search(query: string, { limit }: { limit: number }): Promise<SearchResult[]> {
    const normalizedQuery = query.replace(/\s+/g, " ").trim();
    if (!normalizedQuery) return [];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const failures: unknown[] = [];

    const attempts: SearchAttempt[] = [
      {
        name: "DuckDuckGo",
        run: async () => {
          const url = new URL(DUCKDUCKGO_ENDPOINT);
          url.searchParams.set("q", normalizedQuery);
          url.searchParams.set("kl", "kr-ko");
          const response = await this.fetcher(url, {
            headers: BROWSER_HEADERS,
            signal: controller.signal,
          });
          const html = await response.text();
          if (!response.ok) {
            throw new Error(`DuckDuckGo returned HTTP ${response.status}`);
          }
          return parseDuckDuckGoResults(html, limit);
        },
      },
      {
        name: "Naver",
        run: async () => {
          const url = new URL(NAVER_ENDPOINT);
          url.searchParams.set("where", "nexearch");
          url.searchParams.set("query", normalizedQuery);
          const response = await this.fetcher(url, {
            headers: BROWSER_HEADERS,
            signal: controller.signal,
          });
          const html = await response.text();
          if (!response.ok) {
            throw new Error(`Naver returned HTTP ${response.status}`);
          }
          return parseNaverResults(html, limit);
        },
      },
    ];

    try {
      for (const attempt of attempts) {
        try {
          const results = await attempt.run();
          if (results.length > 0) return results;
        } catch (error) {
          failures.push(new Error(`${attempt.name} search failed`, { cause: error }));
        }
      }
    } finally {
      clearTimeout(timeout);
    }

    if (failures.length === attempts.length) {
      throw new SearchError("SEARCH_PROVIDER", "Every HTML search provider failed", {
        cause: new AggregateError(failures),
      });
    }

    return [];
  }
}
