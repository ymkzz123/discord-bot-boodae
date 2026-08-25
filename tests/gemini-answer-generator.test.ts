import { describe, expect, it, vi } from "vitest";

import { GeminiAnswerGenerator } from "../src/gemini/gemini-answer-generator.js";

describe("GeminiAnswerGenerator", () => {
  it("uses the API key header and returns generated text", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text: "답변 [1]" }] } }] }),
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
    ).resolves.toBe("답변 [1]");

    expect(fetcher).toHaveBeenCalledWith(
      expect.stringContaining("models/gemini-test:generateContent"),
      expect.objectContaining({
        headers: expect.objectContaining({ "x-goog-api-key": "test-api-key-that-is-long-enough" }),
      }),
    );
  });
});
