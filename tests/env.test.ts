import { describe, expect, it } from "vitest";

import {
  loadRuntimeConfig,
  parseAllowedGuildIds,
  parseOptionalDiscordIds,
} from "../src/config/env.js";

const GUILD_ID_1 = "111111111111111111";
const GUILD_ID_2 = "222222222222222222";
const GUILD_ID_3 = "333333333333333333";

describe("parseAllowedGuildIds", () => {
  it("parses, trims, and deduplicates a comma-separated allowlist", () => {
    expect(parseAllowedGuildIds(
      `${GUILD_ID_1}, ${GUILD_ID_2},${GUILD_ID_1}`,
      GUILD_ID_3,
    )).toEqual([
      GUILD_ID_1,
      GUILD_ID_2,
      GUILD_ID_3,
    ]);
  });

  it("rejects invalid IDs and accepts an empty bootstrap list", () => {
    expect(() => parseAllowedGuildIds(`${GUILD_ID_1},not-a-guild`)).toThrow(
      "invalid Discord server ID",
    );
    expect(parseAllowedGuildIds("  ")).toEqual([]);
  });
});

describe("parseOptionalDiscordIds", () => {
  it("accepts an empty alert channel list and rejects non-numeric IDs", () => {
    expect(parseOptionalDiscordIds(undefined, "KBO_ALERT_CHANNEL_IDS")).toEqual([]);
    expect(parseOptionalDiscordIds(
      `${GUILD_ID_1}, ${GUILD_ID_2},${GUILD_ID_1}`,
      "KBO_ALERT_CHANNEL_IDS",
    )).toEqual([GUILD_ID_1, GUILD_ID_2]);
    expect(() => parseOptionalDiscordIds("channel", "KBO_ALERT_CHANNEL_IDS")).toThrow(
      "KBO_ALERT_CHANNEL_IDS contains an invalid Discord ID",
    );
  });
});

describe("loadRuntimeConfig", () => {
  const validEnvironment = {
    DISCORD_CLIENT_ID: "123456789012345678",
    DISCORD_TOKEN: "a-valid-discord-token-value",
    DISCORD_OWNER_USER_ID: "987654321098765432",
    DISCORD_ALLOWED_GUILD_IDS: GUILD_ID_1,
    GEMINI_API_KEY: "a-valid-gemini-api-key-value",
  } satisfies NodeJS.ProcessEnv;

  it("parses the required owner ID and allowlist store path", () => {
    const config = loadRuntimeConfig(validEnvironment);

    expect(config.discordOwnerUserId).toBe("987654321098765432");
    expect(config.allowlistStorePath).toBe(".data/guild-allowlist.json");
  });

  it("rejects a missing or invalid owner ID", () => {
    expect(() => loadRuntimeConfig({
      ...validEnvironment,
      DISCORD_OWNER_USER_ID: undefined,
    })).toThrow();
    expect(() => loadRuntimeConfig({
      ...validEnvironment,
      DISCORD_OWNER_USER_ID: "owner-name",
    })).toThrow("Discord ID must be a valid snowflake");
  });
});
