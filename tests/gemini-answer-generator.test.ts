import { describe, expect, it, vi } from "vitest";

import {
  cleanGeneratedAnswer,
  GeminiAnswerGenerator,
} from "../src/gemini/gemini-answer-generator.js";

describe("GeminiAnswerGenerator", () => {
  it("uses the API key header and returns generated text", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text: "자연스러운 답변" }] } }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const generator = new GeminiAnswerGenerator(
      "test-api-key-that-is-long-enough",
      "gemini-test",
      10_000,
      fetcher,
    );

    await expect(
      generator.generate("질문", [
        { title: "문서", url: "https://example.com", snippet: "설명" },
      ]),
    ).resolves.toBe("자연스러운 답변");

    expect(fetcher).toHaveBeenCalledWith(
      expect.stringContaining("models/gemini-test:generateContent"),
      expect.objectContaining({
        headers: expect.objectContaining({ "x-goog-api-key": "test-api-key-that-is-long-enough" }),
      }),
    );

    const request = fetcher.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(request.body)) as {
      systemInstruction: { parts: Array<{ text: string }> };
      generationConfig: { temperature: number };
    };
    expect(body.systemInstruction.parts[0]?.text).toContain(
      "Never show citations, citation numbers, source lists, URLs",
    );
    expect(body.systemInstruction.parts[0]?.text).toContain("comfortable conversational honorifics");
    expect(body.generationConfig.temperature).toBe(0.45);
  });
});

describe("cleanGeneratedAnswer", () => {
  it("removes citation syntax, decorative Markdown, URLs, and a source section", () => {
    const answer = cleanGeneratedAnswer(`
## 답변
**류현진**은 현재 한화에서 뛰고 있습니다. [1]

자세한 내용은 [관련 문서](https://example.com/article)에서 확인할 수 있습니다.

**출처**
1. https://example.com/article
    `);

    expect(answer).toBe(
      "류현진은 현재 한화에서 뛰고 있습니다.\n\n자세한 내용은 관련 문서에서 확인할 수 있습니다.",
    );
  });
});
