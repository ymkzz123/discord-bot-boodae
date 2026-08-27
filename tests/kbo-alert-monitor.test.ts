import { describe, expect, it, vi } from "vitest";

import {
  buildPlayballEvents,
  KboAlertMonitor,
  type KboAlertEvent,
} from "../src/kbo/kbo-alert-monitor.js";
import type { KboScheduledGame } from "../src/kbo/types.js";

const game: KboScheduledGame = {
  gameId: "20260827HHSK02026",
  gameDate: "2026-08-27",
  gameDateTime: "2026-08-27T18:30:00",
  stadium: "문학",
  statusCode: "STARTED",
  statusText: "1회초",
  cancelled: false,
  suspended: false,
  awayTeam: { code: "HH", name: "한화", fullName: "한화 이글스" },
  homeTeam: { code: "SK", name: "SSG", fullName: "SSG 랜더스" },
};

describe("KBO alert monitor", () => {
  it("creates one playball event per shared start time and ignores cancelled games", () => {
    const cancelled = { ...game, gameId: "cancelled", cancelled: true };
    expect(
      buildPlayballEvents(
        [game, { ...game, gameId: "other" }, cancelled],
        new Date("2026-08-27T09:30:20Z"),
        15 * 60_000,
      ),
    ).toEqual([{ type: "PLAYBALL", key: "playball:2026-08-27T18:30:00" }]);
  });

  it("sends playball and 44 ALERT once per channel, including after another poll", async () => {
    const sentState = new Set<string>();
    const sentEvents: KboAlertEvent[] = [];
    const provider = {
      getSchedule: vi.fn().mockResolvedValue([game]),
      getCurrentPitcher: vi.fn().mockResolvedValue({
        gameId: game.gameId,
        playerCode: "53754",
        name: "김서현",
        team: game.awayTeam,
      }),
    };
    const monitor = new KboAlertMonitor(
      provider,
      {
        channelIds: ["channel-1"],
        send: vi.fn().mockImplementation((_channelId, event) => {
          sentEvents.push(event);
          return Promise.resolve();
        }),
      },
      {
        has: async (key) => sentState.has(key),
        markSent: async (key) => { sentState.add(key); },
      },
      { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      30_000,
      300_000,
      15 * 60_000,
      () => new Date("2026-08-27T09:30:20Z"),
    );

    await expect(monitor.pollOnce()).resolves.toBe(30_000);
    await monitor.pollOnce();
    expect(sentEvents).toEqual([
      { type: "PLAYBALL", key: "playball:2026-08-27T18:30:00" },
      { type: "KIM_SEOHYUN", key: "kim-seohyun:20260827HHSK02026:53754" },
    ]);
  });
});
