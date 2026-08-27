import { describe, expect, it, vi } from "vitest";

import previewFixture from "./fixtures/kbo/preview.json" with { type: "json" };
import scheduleFixture from "./fixtures/kbo/schedule.json" with { type: "json" };
import { NaverKboProvider } from "../src/kbo/naver-kbo-provider.js";
import { JsonHttpClient } from "../src/scraping/json-http-client.js";

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("NaverKboProvider", () => {
  it("collects today's KBO schedule and announced lineups with a cache", async () => {
    const fetcher = vi.fn().mockImplementation((input: string | URL | Request) => {
      const url = String(input);
      return Promise.resolve(jsonResponse(url.includes("/preview") ? previewFixture : scheduleFixture));
    });
    const provider = new NaverKboProvider(new JsonHttpClient(fetcher), 10_000, 30_000);

    const first = await provider.getSchedule("2026-08-27");
    const second = await provider.getSchedule("2026-08-27");
    expect(second).toEqual(first);
    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({
      gameId: "20260827HHSK02026",
      awayTeam: { code: "HH", fullName: "한화 이글스" },
      homeTeam: { code: "SK", fullName: "SSG 랜더스" },
    });

    const lineup = await provider.getLineup(first[0]!);
    expect(lineup.published).toBe(true);
    expect(lineup.game.stadium).toBe("문학");
    expect(lineup.away.startingPitcher).toBe("원정선발");
    expect(lineup.away.batters).toHaveLength(9);
    expect(lineup.home.batters[0]).toEqual({
      battingOrder: 1,
      name: "홈타자1",
      position: "중견수",
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
    const scheduleUrl = new URL(String(fetcher.mock.calls[0]?.[0]));
    expect(scheduleUrl.hostname).toBe("api-gw.sports.naver.com");
    expect(scheduleUrl.searchParams.get("categoryId")).toBe("kbo");
    expect(scheduleUrl.searchParams.get("fromDate")).toBe("2026-08-27");
    expect(scheduleUrl.searchParams.get("toDate")).toBe("2026-08-27");
  });

  it("uses relay lineups after a game starts and preserves the original starter", async () => {
    const startedSchedule = structuredClone(scheduleFixture);
    startedSchedule.result.games[0]!.statusCode = "STARTED";
    const previewWithStarters = structuredClone(previewFixture);
    previewWithStarters.result.previewData.awayTeamLineUp.fullLineUp = [
      { playerName: "원정선발", positionName: "선발투수" },
    ];
    previewWithStarters.result.previewData.homeTeamLineUp.fullLineUp = [
      { playerName: "홈선발", positionName: "선발투수" },
    ];
    const relay = {
      code: 200,
      success: true,
      result: {
        textRelayData: {
          awayLineup: {
            pitcher: [{ name: "원정선발", posName: "투수", batOrder: 0, seqno: 1 }],
            batter: [
              { name: "교체 전", posName: "중", batOrder: 1, seqno: 1 },
              { name: "교체 후", posName: "중", batOrder: 1, seqno: 2 },
            ],
          },
          homeLineup: {
            pitcher: [{ name: "홈선발", posName: "투수", batOrder: 0, seqno: 1 }],
            batter: [{ name: "홈타자", posName: "유", batOrder: 1, seqno: 1 }],
          },
        },
      },
    };
    const fetcher = vi.fn().mockImplementation((input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/relay")) return Promise.resolve(jsonResponse(relay));
      if (url.includes("/preview")) return Promise.resolve(jsonResponse(previewWithStarters));
      return Promise.resolve(jsonResponse(startedSchedule));
    });
    const provider = new NaverKboProvider(new JsonHttpClient(fetcher), 10_000, 30_000);

    const [game] = await provider.getSchedule("2026-08-27");
    const lineup = await provider.getLineup(game!);
    expect(lineup.away.batters).toEqual([
      { battingOrder: 1, name: "교체 전", position: "중" },
    ]);
    expect(lineup.home.batters[0]?.name).toBe("홈타자");
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("rejects a changed upstream response shape", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ success: true, result: {} }));
    const provider = new NaverKboProvider(new JsonHttpClient(fetcher), 10_000, 30_000);

    await expect(provider.getSchedule("2026-08-27")).rejects.toMatchObject({
      code: "KBO_INVALID_RESPONSE",
    });
  });

  it("resolves the actual current pitcher from relay state instead of the roster", async () => {
    const startedSchedule = structuredClone(scheduleFixture);
    startedSchedule.result.games[0]!.statusCode = "STARTED";
    const relay = {
      code: 200,
      success: true,
      result: {
        textRelayData: {
          currentGameState: { pitcher: "53754" },
          homeLineup: { pitcher: [], batter: [] },
          awayLineup: {
            pitcher: [
              { name: "선발투수", pcode: "11111", posName: "투수", batOrder: 0, seqno: 1 },
              { name: "김서현", pcode: "53754", posName: "투수", batOrder: 0, seqno: 2 },
            ],
            batter: [],
          },
        },
      },
    };
    const fetcher = vi.fn().mockImplementation((input: string | URL | Request) => {
      const url = String(input);
      return Promise.resolve(jsonResponse(url.includes("/relay") ? relay : startedSchedule));
    });
    const provider = new NaverKboProvider(new JsonHttpClient(fetcher), 10_000, 30_000);

    const [startedGame] = await provider.getSchedule("2026-08-27");
    await expect(provider.getCurrentPitcher(startedGame!)).resolves.toMatchObject({
      playerCode: "53754",
      name: "김서현",
      team: { code: "HH" },
    });
  });
});
