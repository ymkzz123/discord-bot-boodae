import type { Interaction } from "discord.js";
import { describe, expect, it, vi } from "vitest";

import {
  createInteractionHandler,
  type InteractionDependencies,
} from "../src/bot/interaction-handler.js";

describe("search interaction", () => {
  it("defers and sends the search result without the ephemeral flag", async () => {
    const deferReply = vi.fn().mockResolvedValue(undefined);
    const editReply = vi.fn().mockResolvedValue(undefined);
    const interaction = {
      isChatInputCommand: () => true,
      commandName: "search",
      options: {
        getString: () => "오늘의 AI 뉴스",
      },
      user: { id: "user-1" },
      guildId: "guild-1",
      channelId: "channel-1",
      deferReply,
      editReply,
      followUp: vi.fn().mockResolvedValue(undefined),
    } as unknown as Interaction;
    const dependencies = {
      searchService: {
        search: vi.fn().mockResolvedValue({
          responseId: "response-1",
          markdown: "공개 검색 결과",
          sourceCount: 1,
        }),
      },
      conversations: {
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
      },
      rateLimiter: {
        consume: vi.fn().mockReturnValue({ allowed: true }),
      },
      logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
      maxResponseChars: 10_000,
    } as unknown as InteractionDependencies;

    await createInteractionHandler(dependencies)(interaction);

    expect(deferReply).toHaveBeenCalledWith();
    expect(editReply).toHaveBeenCalledWith({
      content: "공개 검색 결과",
      allowedMentions: { parse: [] },
    });
  });
});
