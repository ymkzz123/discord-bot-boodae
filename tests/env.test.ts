import { describe, expect, it } from "vitest";

import { parseAllowedGuildIds, parseOptionalDiscordIds } from "../src/config/env.js";

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

describe("parseOptionalDiscordIds", () => {
  it("accepts an empty alert channel list and rejects non-numeric IDs", () => {
    expect(parseOptionalDiscordIds(undefined, "KBO_ALERT_CHANNEL_IDS")).toEqual([]);
    expect(parseOptionalDiscordIds("111, 222,111", "KBO_ALERT_CHANNEL_IDS")).toEqual([
      "111",
      "222",
    ]);
    expect(() => parseOptionalDiscordIds("channel", "KBO_ALERT_CHANNEL_IDS")).toThrow(
      "KBO_ALERT_CHANNEL_IDS contains an invalid Discord ID",
    );
  });
});
