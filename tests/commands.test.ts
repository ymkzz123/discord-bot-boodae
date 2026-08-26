import { describe, expect, it } from "vitest";

import { commandPayload } from "../src/bot/commands.js";

describe("search command", () => {
  it("publishes search replies by exposing only the query option", () => {
    const search = commandPayload.find((command) => command.name === "search");

    expect(search?.options?.map((option) => option.name)).toEqual(["query"]);
    expect(search?.description).toBe("웹을 검색해 자연스러운 말투로 답변합니다");
  });

  it("registers the KBO lineup command with a team query", () => {
    const lineup = commandPayload.find((command) => command.name === "lineup");

    expect(lineup?.options?.map((option) => option.name)).toEqual(["query"]);
    expect(lineup?.description).toBe("오늘 KBO 경기와 양 팀의 라인업을 확인합니다");
  });
});
