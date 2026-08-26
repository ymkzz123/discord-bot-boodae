export interface HtmlResponse {
  status: number;
  ok: boolean;
  finalUrl: string;
  html: string;
}

export const BROWSER_HEADERS = {
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
  "cache-control": "no-cache",
  pragma: "no-cache",
  "upgrade-insecure-requests": "1",
  "user-agent": [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "AppleWebKit/537.36 (KHTML, like Gecko)",
    "Chrome/137.0.0.0 Safari/537.36",
  ].join(" "),
} as const;

export class BrowserHttpClient {
  constructor(
    private readonly fetcher: typeof fetch = fetch,
    private readonly maxHtmlChars = 3_000_000,
  ) {}

  async getHtml(
    url: URL,
    options: { signal: AbortSignal; headers?: Record<string, string> },
  ): Promise<HtmlResponse> {
    const response = await this.fetcher(url, {
      headers: { ...BROWSER_HEADERS, ...options.headers },
      redirect: "follow",
      signal: options.signal,
    });
    const html = (await response.text()).slice(0, this.maxHtmlChars);

    return {
      status: response.status,
      ok: response.ok,
      finalUrl: response.url || url.toString(),
      html,
    };
  }
}
