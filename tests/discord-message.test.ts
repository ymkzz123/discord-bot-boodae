import { describe, expect, it } from "vitest";

import { splitDiscordMessage, truncateWithNotice } from "../src/lib/discord-message.js";

describe("splitDiscordMessage", () => {
  it("keeps every chunk inside the requested limit", () => {
    const chunks = splitDiscordMessage("첫 문단입니다. ".repeat(100), 120);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.length <= 120)).toBe(true);
  });

  it("returns a helpful fallback for empty output", () => {
    expect(splitDiscordMessage("   ")).toEqual(["응답 내용이 비어 있습니다."]);
  });
});

describe("truncateWithNotice", () => {
  it("adds a notice and honors the exact maximum", () => {
    const result = truncateWithNotice("가".repeat(500), 120);

    expect(result.length).toBeLessThanOrEqual(120);
    expect(result).toContain("일부를 생략했습니다");
  });
});
