export class JsonHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string,
    message: string,
  ) {
    super(message);
    this.name = "JsonHttpError";
  }
}

const JSON_HEADERS = {
  accept: "application/json",
  "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
  "user-agent": "discord-bot-boodae/0.1 (personal Discord bot)",
} as const;

export class JsonHttpClient {
  constructor(
    private readonly fetcher: typeof fetch = fetch,
    private readonly maxResponseChars = 3_000_000,
  ) {}

  async getJson(
    url: URL,
    options: { signal: AbortSignal; headers?: Record<string, string> },
  ): Promise<unknown> {
    const response = await this.fetcher(url, {
      headers: { ...JSON_HEADERS, ...options.headers },
      redirect: "follow",
      signal: options.signal,
    });
    const text = await response.text();

    if (!response.ok) {
      throw new JsonHttpError(
        response.status,
        response.url || url.toString(),
        `JSON endpoint returned HTTP ${response.status}`,
      );
    }
    if (text.length > this.maxResponseChars) {
      throw new JsonHttpError(
        response.status,
        response.url || url.toString(),
        "JSON response exceeded the configured size limit",
      );
    }

    try {
      return JSON.parse(text) as unknown;
    } catch (error) {
      throw new JsonHttpError(
        response.status,
        response.url || url.toString(),
        error instanceof Error ? `Invalid JSON response: ${error.message}` : "Invalid JSON response",
      );
    }
  }
}
