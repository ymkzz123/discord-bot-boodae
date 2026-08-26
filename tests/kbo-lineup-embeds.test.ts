import { describe, expect, it } from "vitest";

import { buildKboLineupEmbeds } from "../src/bot/kbo-lineup-embeds.js";
import type { KboLineupAnswer } from "../src/kbo/types.js";

function makeAnswer(): KboLineupAnswer {
  return {
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
      away: {
        startingPitcher: "류현진",
        batters: [{ battingOrder: 1, name: "타자1", position: "중견수" }],
      },
      home: { startingPitcher: "상대선발", batters: [] },
      published: false,
    }],
  };
}

describe("buildKboLineupEmbeds", () => {
  it("builds a vertically stacked mobile-friendly game card", () => {
    const [embed] = buildKboLineupEmbeds(makeAnswer()).map((item) => item.toJSON());

    expect(embed).toMatchObject({
      author: { name: "KBO 오늘의 라인업" },
      title: "한화 vs SSG",
      description: expect.stringContaining("18:30"),
      fields: [
        {
          name: "원정  |  한화 이글스",
          value: expect.stringContaining("류현진"),
          inline: false,
        },
        {
          name: "홈  |  SSG 랜더스",
          value: expect.stringContaining("타순은 아직 발표되지 않았습니다"),
          inline: false,
        },
      ],
      footer: { text: "전체 타순 발표 전 · 발표 후 다시 조회해 주세요" },
    });
  });

  it("uses one numbered card per doubleheader game", () => {
    const answer = makeAnswer();
    answer.games.push(structuredClone(answer.games[0]!));

    const embeds = buildKboLineupEmbeds(answer).map((item) => item.toJSON());

    expect(embeds).toHaveLength(2);
    expect(embeds[0]?.title).toBe("한화 vs SSG · 1차전");
    expect(embeds[1]?.title).toBe("한화 vs SSG · 2차전");
  });
});
