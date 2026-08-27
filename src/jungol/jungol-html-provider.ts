import { JSDOM, type JsdomDocument, type JsdomElement } from "jsdom";

import { AsyncTtlCache } from "../lib/async-ttl-cache.js";
import { BrowserHttpClient } from "../scraping/browser-http-client.js";
import { JungolError } from "./jungol-error.js";
import type {
  JungolAccountSummary,
  JungolProblem,
  JungolProblemSummary,
  JungolProvider,
} from "./types.js";

const JUNGOL_BASE_URL = "https://jungol.co.kr";
const JUNGOL_HEADERS = {
  "user-agent": "discord-bot-boodae/0.1 (+https://github.com/ymkzz123/discord-bot-boodae)",
} as const;

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function parseCount(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value.replaceAll(",", ""));
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function metaContent(document: JsdomDocument, property: string): string {
  return normalizeText(
    document.querySelector(`meta[property="${property}"]`)?.getAttribute("content"),
  );
}

function hasUpstreamError(document: JsdomDocument): boolean {
  const text = normalizeText(document.body.textContent).toLowerCase();
  return [
    "invalid server response",
    "something went wrong",
    "문제가 발생했습니다",
    "서버 응답",
  ].some((marker) => text.includes(marker));
}

function titleFromProblemAnchor(anchor: JsdomElement, id: number): string {
  const ariaLabel = normalizeText(anchor.getAttribute("aria-label"));
  const raw = ariaLabel || normalizeText(anchor.textContent);
  const withoutId = raw
    .replace(new RegExp(`^#?${id}\\s*`), "")
    .replace(/\s+(?:Bronze|Silver|Gold|Platinum|Diamond|Ruby)\s+[IVX]+.*$/i, "")
    .trim();
  return withoutId || `문제 #${id}`;
}

export class JungolHtmlProvider implements JungolProvider {
  private readonly cache: AsyncTtlCache<unknown>;

  constructor(
    private readonly http: BrowserHttpClient,
    private readonly timeoutMs: number,
    cacheTtlMs: number,
    now: () => number = Date.now,
  ) {
    this.cache = new AsyncTtlCache(cacheTtlMs, now);
  }

  async getProblem(problemId: number): Promise<JungolProblem> {
    if (!Number.isSafeInteger(problemId) || problemId < 1) {
      throw new JungolError("JUNGOL_INVALID_INPUT", "문제 번호는 1 이상의 정수여야 합니다.");
    }

    const url = new URL(`/problem/${problemId}`, JUNGOL_BASE_URL);
    let document: JsdomDocument;
    try {
      document = await this.getDocument(`problem:${problemId}`, url);
    } catch (error) {
      if (error instanceof JungolError && error.code === "JUNGOL_NOT_FOUND") {
        throw new JungolError("JUNGOL_NOT_FOUND", `정올 문제 #${problemId}을 찾지 못했습니다.`);
      }
      throw error;
    }
    const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute("href");
    if (canonical && !new URL(canonical, JUNGOL_BASE_URL).pathname.match(/^\/problem\/\d+\/?$/)) {
      throw new JungolError(
        canonical ? "JUNGOL_INVALID_RESPONSE" : "JUNGOL_NOT_FOUND",
        canonical
          ? `정올 문제 #${problemId}의 공개 정보를 읽지 못했습니다.`
          : `정올 문제 #${problemId}을 찾지 못했습니다.`,
      );
    }

    const ogTitle = metaContent(document, "og:title");
    if (!ogTitle) {
      if (hasUpstreamError(document)) {
        throw new JungolError("JUNGOL_UPSTREAM_FAILED", "Jungol returned an upstream error page");
      }
      throw new JungolError("JUNGOL_NOT_FOUND", `정올 문제 #${problemId}을 찾지 못했습니다.`);
    }

    const [rawTitle, rawTier] = ogTitle.split(" · ");
    const description = metaContent(document, "og:description");
    const solvedMatch = description.match(/([\d,]+)\s+solved users?/i);
    const submissionMatch = description.match(/([\d,]+)\s+submissions?/i);
    const bodyText = normalizeText(document.body.textContent);
    const limitMatch = bodyText.match(
      /(?:timer\s*)?(\d+(?:\.\d+)?\s*(?:ms|s|초))\s+(?:memory\s*)?([\d.]+\s*(?:KB|MB|GB))/i,
    );
    const tags = [...document.querySelectorAll('a[href*="/problem?tag="],a[href*="/problem?tags="]')]
      .map((anchor) => normalizeText(anchor.textContent))
      .filter(Boolean);

    return {
      id: problemId,
      title: normalizeText(rawTitle) || `문제 #${problemId}`,
      tier: normalizeText(rawTier) || null,
      solvedUsers: parseCount(solvedMatch?.[1]),
      submissions: parseCount(submissionMatch?.[1]),
      timeLimit: normalizeText(limitMatch?.[1]) || null,
      memoryLimit: normalizeText(limitMatch?.[2]) || null,
      tags: [...new Set(tags)].slice(0, 10),
      url: new URL(`/problem/${problemId}`, JUNGOL_BASE_URL).toString(),
    };
  }

  async searchProblemsByTag(query: string): Promise<JungolProblemSummary[]> {
    const normalizedQuery = normalizeText(query);
    if (normalizedQuery.length < 1 || normalizedQuery.length > 60) {
      throw new JungolError("JUNGOL_INVALID_INPUT", "태그는 1~60자로 입력해 주세요.");
    }

    const url = new URL("/problem", JUNGOL_BASE_URL);
    url.searchParams.set("tag", normalizedQuery);
    const document = await this.getDocument(`tag:${normalizedQuery.toLowerCase()}`, url);
    if (hasUpstreamError(document)) {
      throw new JungolError("JUNGOL_UPSTREAM_FAILED", "Jungol returned an upstream error page");
    }

    const results = new Map<number, JungolProblemSummary>();
    for (const anchor of document.querySelectorAll("a[href]")) {
      const href = anchor.getAttribute("href");
      if (!href) continue;
      const match = new URL(href, JUNGOL_BASE_URL).pathname.match(/^\/problem\/(\d+)\/?$/);
      if (!match) continue;
      const id = Number(match[1]);
      if (!Number.isSafeInteger(id) || results.has(id)) continue;
      results.set(id, {
        id,
        title: titleFromProblemAnchor(anchor, id),
        url: new URL(`/problem/${id}`, JUNGOL_BASE_URL).toString(),
      });
      if (results.size >= 10) break;
    }

    if (results.size === 0) {
      throw new JungolError(
        "JUNGOL_NO_RESULTS",
        `정올에서 '${normalizedQuery}' 태그의 문제를 찾지 못했습니다. 태그 이름을 확인해 주세요.`,
      );
    }
    return [...results.values()];
  }

  async searchAccounts(handle: string): Promise<JungolAccountSummary[]> {
    const normalizedHandle = normalizeText(handle).replace(/^@/, "");
    if (!/^[\p{L}\p{N}_.-]{2,30}$/u.test(normalizedHandle)) {
      throw new JungolError(
        "JUNGOL_INVALID_INPUT",
        "유저 이름은 2~30자의 문자, 숫자, 밑줄, 점 또는 하이픈으로 입력해 주세요.",
      );
    }

    const url = new URL("/search", JUNGOL_BASE_URL);
    url.searchParams.set("keyword", normalizedHandle);
    url.searchParams.set("target", "account");
    const document = await this.getDocument(`account:${normalizedHandle.toLowerCase()}`, url);
    if (hasUpstreamError(document)) {
      throw new JungolError("JUNGOL_UPSTREAM_FAILED", "Jungol returned an upstream error page");
    }

    const results = new Map<number, JungolAccountSummary>();
    for (const anchor of document.querySelectorAll('a[href^="/account/"]')) {
      const href = anchor.getAttribute("href");
      if (!href) continue;
      const match = new URL(href, JUNGOL_BASE_URL).pathname.match(/^\/account\/(\d+)\/?$/);
      if (!match) continue;
      const id = Number(match[1]);
      const text = normalizeText(anchor.textContent);
      const handleMatch = text.match(/@([\p{L}\p{N}_.-]{2,30})/u);
      if (!handleMatch?.[1] || results.has(id)) continue;
      const foundHandle = handleMatch[1];
      const displayName = text
        .replace(new RegExp(`@${foundHandle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}.*$`, "u"), "")
        .trim();
      results.set(id, {
        id,
        handle: foundHandle,
        displayName: displayName || null,
        url: new URL(`/account/${id}`, JUNGOL_BASE_URL).toString(),
      });
      if (results.size >= 5) break;
    }

    if (results.size === 0) {
      throw new JungolError(
        "JUNGOL_NO_RESULTS",
        `정올에서 '${normalizedHandle}' 유저를 찾지 못했습니다.`,
      );
    }

    return [...results.values()].sort((left, right) => {
      const leftExact = left.handle.toLowerCase() === normalizedHandle.toLowerCase();
      const rightExact = right.handle.toLowerCase() === normalizedHandle.toLowerCase();
      return Number(rightExact) - Number(leftExact);
    });
  }

  private async getDocument(cacheKey: string, url: URL): Promise<JsdomDocument> {
    try {
      const html = await this.cache.getOrLoad(cacheKey, async () => {
        const response = await this.http.getHtml(url, {
          signal: AbortSignal.timeout(this.timeoutMs),
          headers: JUNGOL_HEADERS,
        });
        if (response.status === 404) {
          throw new JungolError("JUNGOL_NOT_FOUND", "Jungol resource was not found");
        }
        if (!response.ok) {
          throw new JungolError(
            "JUNGOL_UPSTREAM_FAILED",
            `Jungol returned HTTP ${response.status}`,
          );
        }
        return response.html;
      });
      return new JSDOM(html as string).window.document;
    } catch (error) {
      if (error instanceof JungolError) throw error;
      throw new JungolError("JUNGOL_UPSTREAM_FAILED", `Failed to request ${url.pathname}`, {
        cause: error,
      });
    }
  }
}
