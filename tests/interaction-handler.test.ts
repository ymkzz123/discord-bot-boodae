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
    expect(dependencies.conversations.set).toHaveBeenCalledWith(
      "guild-1:channel-1:user-1",
      { query: "오늘의 AI 뉴스", answer: "공개 검색 결과" },
    );
  });

  it("publishes the formatted KBO lineup response", async () => {
    const deferReply = vi.fn().mockResolvedValue(undefined);
    const editReply = vi.fn().mockResolvedValue(undefined);
    const interaction = {
      isChatInputCommand: () => true,
      commandName: "lineup",
      options: { getString: () => "한화" },
      user: { id: "user-1" },
      guildId: "guild-1",
      channelId: "channel-1",
      deferReply,
      editReply,
      followUp: vi.fn().mockResolvedValue(undefined),
    } as unknown as Interaction;
    const dependencies = {
      searchService: { search: vi.fn() },
      kboLineupService: {
        getToday: vi.fn().mockResolvedValue({
          date: "2026-08-27",
          requestedTeam: { code: "HH", name: "한화", fullName: "한화 이글스" },
          games: [{
            game: {
              gameId: "game-1",
              gameDate: "2026-08-27",
              gameDateTime: "2026-08-27T18:30:00",
              stadium: "문학",
              statusCode: "BEFORE",
              statusText: "경기전",
              cancelled: false,
              suspended: false,
              awayTeam: { code: "HH", name: "한화", fullName: "한화 이글스" },
              homeTeam: { code: "SK", name: "SSG", fullName: "SSG 랜더스" },
            },
            away: { startingPitcher: "원정선발", batters: [] },
            home: { startingPitcher: "홈선발", batters: [] },
            published: false,
          }],
        }),
      },
      conversations: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
      rateLimiter: { consume: vi.fn().mockReturnValue({ allowed: true }) },
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      maxResponseChars: 10_000,
    } as unknown as InteractionDependencies;

    await createInteractionHandler(dependencies)(interaction);

    expect(deferReply).toHaveBeenCalledWith();
    expect(editReply).toHaveBeenCalledWith({
      content: expect.stringContaining("8월 27일 한화 vs SSG"),
      allowedMentions: { parse: [] },
    });
    expect(dependencies.kboLineupService.getToday).toHaveBeenCalledWith("한화");
  });
});
