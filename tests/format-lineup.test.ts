import { describe, expect, it } from "vitest";

import { formatKboLineupAnswer } from "../src/kbo/format-lineup.js";
import type { KboLineupAnswer } from "../src/kbo/types.js";

describe("formatKboLineupAnswer", () => {
  it("shows the matchup and explains that only starters are available", () => {
    const answer: KboLineupAnswer = {
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
    };

    const text = formatKboLineupAnswer(answer);
    expect(text).toContain("8월 27일 한화 vs SSG");
    expect(text).toContain("18:30 · 문학 · 경기 전");
    expect(text).toContain("한화 이글스\n선발투수: 원정선발");
    expect(text).toContain("전체 타순은 아직 발표되지 않았습니다");
    expect(text).not.toContain("http");
  });
});
