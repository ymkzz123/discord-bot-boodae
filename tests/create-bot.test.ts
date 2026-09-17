import type { Guild } from "discord.js";
import { describe, expect, it, vi } from "vitest";

import { enforceGuildAccess } from "../src/bot/create-bot.js";

function createLogger() {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

describe("enforceGuildAccess", () => {
  it("keeps an allowed guild and synchronizes its commands", async () => {
    const leave = vi.fn();
    const synchronize = vi.fn().mockResolvedValue(undefined);
    const logger = createLogger();
    const guild = { id: "111111111111111111", name: "Allowed", leave } as unknown as Guild;

    await enforceGuildAccess(guild, {
      guildAllowlist: {
        has: () => true,
        list: () => [guild.id],
        add: vi.fn(),
        remove: vi.fn(),
      },
      commandSynchronizer: { synchronize, clear: vi.fn() },
    }, logger);

    expect(synchronize).toHaveBeenCalledWith(guild.id);
    expect(leave).not.toHaveBeenCalled();
  });

  it("rejects an unauthorized guild and makes the bot leave", async () => {
    const leave = vi.fn().mockResolvedValue(undefined);
    const synchronize = vi.fn();
    const logger = createLogger();
    const guild = { id: "222222222222222222", name: "Blocked", leave } as unknown as Guild;

    await enforceGuildAccess(guild, {
      guildAllowlist: {
        has: () => false,
        list: () => [],
        add: vi.fn(),
        remove: vi.fn(),
      },
      commandSynchronizer: { synchronize, clear: vi.fn() },
    }, logger);

    expect(synchronize).not.toHaveBeenCalled();
    expect(leave).toHaveBeenCalledOnce();
    expect(logger.warn).toHaveBeenCalledWith("Leaving unauthorized guild", {
      guildId: guild.id,
      guildName: guild.name,
    });
  });
});
