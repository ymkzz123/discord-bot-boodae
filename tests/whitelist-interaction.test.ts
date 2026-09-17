import { MessageFlags, type Interaction } from "discord.js";
import { describe, expect, it, vi } from "vitest";

import {
  createInteractionHandler,
  type InteractionDependencies,
} from "../src/bot/interaction-handler.js";

const OWNER_ID = "999999999999999999";
const GUILD_ID = "111111111111111111";

function createDependencies(initialGuildIds: string[] = []) {
  const guildIds = new Set(initialGuildIds);
  const add = vi.fn(async (guildId: string) => {
    if (guildIds.has(guildId)) return false;
    guildIds.add(guildId);
    return true;
  });
  const remove = vi.fn(async (guildId: string) => {
    if (!guildIds.has(guildId)) return false;
    guildIds.delete(guildId);
    return true;
  });

  return {
    ownerUserId: OWNER_ID,
    guildAllowlist: {
      has: (guildId: string) => guildIds.has(guildId),
      list: () => [...guildIds],
      add,
      remove,
    },
    commandSynchronizer: {
      synchronize: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    },
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  } as unknown as InteractionDependencies;
}

function createInteraction(options: {
  userId?: string;
  subcommand: "add" | "remove" | "list";
  guildId?: string;
  cachedGuilds?: Map<string, { name: string; leave: ReturnType<typeof vi.fn> }>;
}) {
  const reply = vi.fn().mockResolvedValue(undefined);
  const deferReply = vi.fn().mockResolvedValue(undefined);
  const editReply = vi.fn().mockResolvedValue(undefined);
  const cachedGuilds = options.cachedGuilds ?? new Map();
  const interaction = {
    isChatInputCommand: () => true,
    commandName: "whitelist",
    user: { id: options.userId ?? OWNER_ID },
    guildId: "999111222333444555",
    channelId: "channel-1",
    options: {
      getSubcommand: () => options.subcommand,
      getString: () => options.guildId,
    },
    client: {
      guilds: {
        cache: {
          get: (guildId: string) => cachedGuilds.get(guildId),
        },
      },
    },
    reply,
    deferReply,
    editReply,
  } as unknown as Interaction;

  return { interaction, reply, deferReply, editReply };
}

describe("whitelist interaction", () => {
  it("rejects a non-owner without changing the whitelist", async () => {
    const dependencies = createDependencies();
    const { interaction, reply } = createInteraction({
      userId: "888888888888888888",
      subcommand: "add",
      guildId: GUILD_ID,
    });

    await createInteractionHandler(dependencies)(interaction);

    expect(reply).toHaveBeenCalledWith({
      content: "이 명령을 사용할 권한이 없습니다.",
      allowedMentions: { parse: [] },
      flags: MessageFlags.Ephemeral,
    });
    expect(dependencies.guildAllowlist.add).not.toHaveBeenCalled();
  });

  it("lets the exact owner add a guild and synchronizes commands when present", async () => {
    const leave = vi.fn();
    const dependencies = createDependencies();
    const { interaction, deferReply, editReply } = createInteraction({
      subcommand: "add",
      guildId: GUILD_ID,
      cachedGuilds: new Map([[GUILD_ID, { name: "Server A", leave }]]),
    });

    await createInteractionHandler(dependencies)(interaction);

    expect(deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
    expect(dependencies.guildAllowlist.add).toHaveBeenCalledWith(GUILD_ID);
    expect(dependencies.commandSynchronizer.synchronize).toHaveBeenCalledWith(GUILD_ID);
    expect(editReply).toHaveBeenCalledWith(expect.objectContaining({
      content: expect.stringContaining("화이트리스트에 추가하고 슬래시 명령을 동기화했습니다"),
    }));
  });

  it("returns an idempotent response for a duplicate add", async () => {
    const dependencies = createDependencies([GUILD_ID]);
    const { interaction, editReply } = createInteraction({
      subcommand: "add",
      guildId: GUILD_ID,
    });

    await createInteractionHandler(dependencies)(interaction);

    expect(editReply).toHaveBeenCalledWith(expect.objectContaining({
      content: expect.stringContaining("이미 화이트리스트에 등록"),
    }));
    expect(dependencies.commandSynchronizer.synchronize).not.toHaveBeenCalled();
  });

  it("removes a guild, clears commands, and safely leaves it", async () => {
    const leave = vi.fn().mockResolvedValue(undefined);
    const dependencies = createDependencies([GUILD_ID]);
    const { interaction, editReply } = createInteraction({
      subcommand: "remove",
      guildId: GUILD_ID,
      cachedGuilds: new Map([[GUILD_ID, { name: "Server A", leave }]]),
    });

    await createInteractionHandler(dependencies)(interaction);

    expect(dependencies.guildAllowlist.remove).toHaveBeenCalledWith(GUILD_ID);
    expect(dependencies.commandSynchronizer.clear).toHaveBeenCalledWith(GUILD_ID);
    expect(leave).toHaveBeenCalledOnce();
    expect(editReply).toHaveBeenCalledWith(expect.objectContaining({
      content: expect.stringContaining("화이트리스트에서 제거하고 봇이 서버를 나갔습니다"),
    }));
  });

  it("keeps the persisted removal effective when a Discord API cleanup fails", async () => {
    const leave = vi.fn().mockResolvedValue(undefined);
    const dependencies = createDependencies([GUILD_ID]);
    vi.mocked(dependencies.commandSynchronizer.clear).mockRejectedValueOnce(
      new Error("Discord unavailable"),
    );
    const { interaction, editReply } = createInteraction({
      subcommand: "remove",
      guildId: GUILD_ID,
      cachedGuilds: new Map([[GUILD_ID, { name: "Server A", leave }]]),
    });

    await createInteractionHandler(dependencies)(interaction);

    expect(dependencies.guildAllowlist.has(GUILD_ID)).toBe(false);
    expect(leave).toHaveBeenCalledOnce();
    expect(editReply).toHaveBeenCalledWith(expect.objectContaining({
      content: expect.stringContaining("화이트리스트에서 제거했습니다"),
    }));
  });

  it("returns an idempotent response when removing a nonexistent guild", async () => {
    const dependencies = createDependencies();
    const { interaction, editReply } = createInteraction({
      subcommand: "remove",
      guildId: GUILD_ID,
    });

    await createInteractionHandler(dependencies)(interaction);

    expect(editReply).toHaveBeenCalledWith(expect.objectContaining({
      content: expect.stringContaining("등록되어 있지 않습니다"),
    }));
    expect(dependencies.commandSynchronizer.clear).not.toHaveBeenCalled();
  });

  it("lists cached guild names and falls back to an ID", async () => {
    const otherGuildId = "222222222222222222";
    const dependencies = createDependencies([GUILD_ID, otherGuildId]);
    const { interaction, reply } = createInteraction({
      subcommand: "list",
      cachedGuilds: new Map([[GUILD_ID, { name: "Server A", leave: vi.fn() }]]),
    });

    await createInteractionHandler(dependencies)(interaction);

    expect(reply).toHaveBeenCalledWith({
      content: `등록된 서버 (2개)\n\n• Server A — ${GUILD_ID}\n• ${otherGuildId}`,
      allowedMentions: { parse: [] },
      flags: MessageFlags.Ephemeral,
    });
  });

  it("rejects an invalid guild ID before persistence", async () => {
    const dependencies = createDependencies();
    const { interaction, reply, deferReply } = createInteraction({
      subcommand: "add",
      guildId: "not-a-snowflake",
    });

    await createInteractionHandler(dependencies)(interaction);

    expect(reply).toHaveBeenCalledWith({
      content: "올바른 Discord 서버 ID를 입력해 주세요.",
      allowedMentions: { parse: [] },
      flags: MessageFlags.Ephemeral,
    });
    expect(deferReply).not.toHaveBeenCalled();
    expect(dependencies.guildAllowlist.add).not.toHaveBeenCalled();
  });
});
