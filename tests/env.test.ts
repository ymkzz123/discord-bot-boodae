import { describe, expect, it } from "vitest";

import { parseAllowedGuildIds } from "../src/config/env.js";

describe("parseAllowedGuildIds", () => {
  it("parses, trims, and deduplicates a comma-separated allowlist", () => {
    expect(parseAllowedGuildIds("111, 222,111", "333")).toEqual([
      "111",
      "222",
      "333",
    ]);
  });

  it("rejects invalid and empty allowlists", () => {
    expect(() => parseAllowedGuildIds("111,not-a-guild")).toThrow(
      "invalid Discord server ID",
    );
    expect(() => parseAllowedGuildIds("  ")).toThrow(
      "DISCORD_ALLOWED_GUILD_IDS is required",
    );
  });
});
