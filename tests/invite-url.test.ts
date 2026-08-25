import { describe, expect, it } from "vitest";

import { buildBotInviteUrl } from "../src/bot/invite-url.js";

describe("buildBotInviteUrl", () => {
  it("creates a guild-install URL with the required scopes and permissions", () => {
    const url = new URL(buildBotInviteUrl({ clientId: "123456789012345678" }));

    expect(url.origin).toBe("https://discord.com");
    expect(url.pathname).toBe("/oauth2/authorize");
    expect(url.searchParams.get("client_id")).toBe("123456789012345678");
    expect(url.searchParams.get("scope")?.split(" ").sort()).toEqual([
      "applications.commands",
      "bot",
    ]);
    expect(url.searchParams.get("permissions")).toMatch(/^\d+$/);
    expect(url.searchParams.get("integration_type")).toBe("0");
  });

  it("locks the guild picker when a development guild is configured", () => {
    const url = new URL(
      buildBotInviteUrl({
        clientId: "123456789012345678",
        guildId: "987654321098765432",
      }),
    );

    expect(url.searchParams.get("guild_id")).toBe("987654321098765432");
    expect(url.searchParams.get("disable_guild_select")).toBe("true");
  });
});
