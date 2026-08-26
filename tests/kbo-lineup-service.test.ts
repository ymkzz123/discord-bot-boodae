import { describe, expect, it, vi } from "vitest";

import { KboLineupService, formatKoreanDate } from "../src/kbo/kbo-lineup-service.js";
import type { KboDataProvider, KboScheduledGame } from "../src/kbo/types.js";

const game: KboScheduledGame = {
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
};

describe("KboLineupService", () => {
  it("resolves a team alias and uses the Korean calendar date", async () => {
    const provider = {
      getSchedule: vi.fn().mockResolvedValue([game]),
      getLineup: vi.fn().mockResolvedValue({
        game,
        away: { startingPitcher: null, batters: [] },
        home: { startingPitcher: null, batters: [] },
        published: false,
      }),
    } satisfies KboDataProvider;
    const service = new KboLineupService(
      provider,
      () => new Date("2026-08-26T15:30:00.000Z"),
    );

    const answer = await service.getToday("한화 이글스");
    expect(answer.date).toBe("2026-08-27");
    expect(answer.requestedTeam.code).toBe("HH");
    expect(provider.getSchedule).toHaveBeenCalledWith("2026-08-27");
    expect(provider.getLineup).toHaveBeenCalledWith(game);
  });

  it("rejects unknown team names with the supported list", async () => {
    const provider = {
      getSchedule: vi.fn(),
      getLineup: vi.fn(),
    } satisfies KboDataProvider;
    const service = new KboLineupService(provider);

    await expect(service.getToday("서울 야구단")).rejects.toMatchObject({
      code: "KBO_TEAM_NOT_FOUND",
      message: expect.stringContaining("LG, KT, SSG"),
    });
    expect(provider.getSchedule).not.toHaveBeenCalled();
  });

  it("reports a day without a matching game", async () => {
    const provider = {
      getSchedule: vi.fn().mockResolvedValue([]),
      getLineup: vi.fn(),
    } satisfies KboDataProvider;
    const service = new KboLineupService(provider);

    await expect(service.getToday("기아")).rejects.toMatchObject({
      code: "KBO_NO_GAME",
    });
  });
});

describe("formatKoreanDate", () => {
  it("does not depend on the server's local timezone", () => {
    expect(formatKoreanDate(new Date("2026-08-26T14:59:59.000Z"))).toBe("2026-08-26");
    expect(formatKoreanDate(new Date("2026-08-26T15:00:00.000Z"))).toBe("2026-08-27");
  });
});
