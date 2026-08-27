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

  it("registers the three Jungol commands with the requested descriptions", () => {
    const problem = commandPayload.find((command) => command.name === "problem");
    const tag = commandPayload.find((command) => command.name === "tag");
    const user = commandPayload.find((command) => command.name === "user");

    expect(problem?.description).toBe("문제번호로 문제찾기");
    expect(problem?.options?.map((option) => option.name)).toEqual(["problem-id"]);
    expect(tag?.description).toBe("태그로 문제 검색하기");
    expect(tag?.options?.map((option) => option.name)).toEqual(["query"]);
    expect(user?.description).toBe("유저 검색하기");
    expect(user?.options?.map((option) => option.name)).toEqual(["handle"]);
  });

  it("registers kboplayer without any options", () => {
    const command = commandPayload.find((item) => item.name === "kboplayer");
    expect(command?.options ?? []).toEqual([]);
  });
});
