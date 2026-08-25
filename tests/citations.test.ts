import { describe, expect, it } from "vitest";

import { appendSourceList, renderCitations } from "../src/openai/citations.js";

describe("renderCitations", () => {
  it("turns a cited span into a clickable Markdown link", () => {
    const result = renderCitations("서울의 오늘 기온은 25도입니다.", [
      {
        startIndex: 11,
        endIndex: 14,
        url: "https://weather.example/today",
        title: "오늘의 날씨",
      },
    ]);

    expect(result.markdown).toBe(
      "서울의 오늘 기온은 [25도](https://weather.example/today)입니다.",
    );
    expect(result.sources).toEqual([
      { url: "https://weather.example/today", title: "오늘의 날씨" },
    ]);
  });

  it("ignores invalid ranges and URLs", () => {
    const result = renderCitations("answer", [
      { startIndex: -1, endIndex: 2, url: "https://example.com", title: "bad" },
      { startIndex: 0, endIndex: 3, url: "not-a-url", title: "bad" },
    ]);

    expect(result).toEqual({ markdown: "answer", sources: [] });
  });
});

describe("appendSourceList", () => {
  it("adds a compact source section", () => {
    expect(
      appendSourceList("답변", [{ title: "공식 문서", url: "https://example.com" }]),
    ).toContain("**출처**\n1. [공식 문서](https://example.com)");
  });
});
