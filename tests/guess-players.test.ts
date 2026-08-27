import { describe, expect, it, vi } from "vitest";

import { KBO_GUESS_PLAYERS, pickRandomKboPlayer } from "../src/kbo/guess-players.js";

describe("KBO guessing player pool", () => {
  it("contains modern players and only intentionally selected early legends", () => {
    expect(KBO_GUESS_PLAYERS).toContain("류현진");
    expect(KBO_GUESS_PLAYERS).toContain("김서현");
    expect(KBO_GUESS_PLAYERS).toContain("선동열");
    expect(KBO_GUESS_PLAYERS).toContain("최동원");
    expect(new Set(KBO_GUESS_PLAYERS).size).toBe(KBO_GUESS_PLAYERS.length);
  });

  it("selects one player through an injectable secure index source", () => {
    const nextIndex = vi.fn().mockReturnValue(1);
    expect(pickRandomKboPlayer(nextIndex)).toEqual({
      name: KBO_GUESS_PLAYERS[1],
      team: "KT 위즈",
    });
    expect(nextIndex).toHaveBeenCalledWith(KBO_GUESS_PLAYERS.length);
  });

  it("adds a representative team to every possible answer", () => {
    KBO_GUESS_PLAYERS.forEach((name, index) => {
      expect(pickRandomKboPlayer(() => index)).toMatchObject({
        name,
        team: expect.any(String),
      });
    });
  });
});
