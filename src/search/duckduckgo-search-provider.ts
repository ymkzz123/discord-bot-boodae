import { SearchError } from "./search-error.js";
import type { SearchProvider, SearchResult } from "./types.js";

const SEARCH_ENDPOINT = "https://html.duckduckgo.com/html/";

function decodeHtml(value: string): string {
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
        const value = Number.parseInt(entity.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
        return Number.isFinite(value) ? String.fromCodePoint(value) : "";
      }

      return named[entity.toLowerCase()] ?? `&${entity};`;
    })
    .replace(/\s+/g, " ")
    .trim();
}

function resolveResultUrl(value: string): string | undefined {
  try {
    const url = new URL(value, "https://duckduckgo.com");
    const redirected = url.searchParams.get("uddg");
    const result = redirected ? new URL(redirected) : url;
    return result.protocol === "http:" || result.protocol === "https:"
      ? result.toString()
      : undefined;
  } catch {
    return undefined;
  }
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

    const url = resolveResultUrl(href);
    if (!url || seen.has(url)) continue;

    const sectionEnd = links[index + 1]?.index ?? html.length;
    const section = html.slice((match.index ?? 0) + match[0].length, sectionEnd);
    const snippetHtml = section.match(
      /<(?:a|div)\b[^>]*class=["'][^"']*\bresult__snippet\b[^"']*["'][^>]*>([\s\S]*?)<\/(?:a|div)>/i,
    )?.[1];
    const title = decodeHtml(titleHtml);
    const snippet = decodeHtml(snippetHtml ?? "");
    if (!title) continue;

    seen.add(url);
    results.push({ title, url, snippet });
  }

  return results;
}

export class DuckDuckGoSearchProvider implements SearchProvider {
  readonly id = "duckduckgo";

  constructor(
    private readonly timeoutMs: number,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async search(query: string, { limit }: { limit: number }): Promise<SearchResult[]> {
    let response: Response;

    try {
      response = await this.fetcher(SEARCH_ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "user-agent": "discord-web-search-bot/0.2 (+https://github.com/ymkzz123/discord-bot-boodae)",
        },
        body: new URLSearchParams({ q: query, kl: "wt-wt" }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      if (error instanceof Error && (error.name.includes("Abort") || error.name.includes("Timeout"))) {
        throw error;
      }
      throw new SearchError("SEARCH_PROVIDER", "DuckDuckGo request failed", { cause: error });
    }

    if (!response.ok) {
      throw new SearchError(
        "SEARCH_PROVIDER",
        `DuckDuckGo returned HTTP ${response.status}`,
      );
    }

    return parseDuckDuckGoResults(await response.text(), limit);
  }
}
