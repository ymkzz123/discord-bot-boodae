import { describe, expect, it } from "vitest";

import { appendSourceList } from "../src/search/sources.js";

describe("appendSourceList", () => {
  it("adds numbered clickable sources", () => {
    expect(
      appendSourceList("답변 [1]", [
        { title: "공식 문서", url: "https://example.com/docs", snippet: "설명" },
      ]),
    ).toBe("답변 [1]\n\n**출처**\n1. [공식 문서](https://example.com/docs)");
  });
});
