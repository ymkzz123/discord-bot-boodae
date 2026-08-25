import { describe, expect, it } from "vitest";

import { ConversationStore } from "../src/state/conversation-store.js";

describe("ConversationStore", () => {
  it("expires the previous turn after the configured TTL", () => {
    let now = 1_000;
    const store = new ConversationStore(500, () => now);

    const turn = { query: "첫 질문", answer: "첫 답변" };
    store.set("user", turn);
    expect(store.get("user")).toEqual(turn);

    now = 1_500;
    expect(store.get("user")).toBeUndefined();
  });

  it("deletes a conversation explicitly", () => {
    const store = new ConversationStore(500);
    store.set("user", { query: "첫 질문", answer: "첫 답변" });

    expect(store.delete("user")).toBe(true);
    expect(store.get("user")).toBeUndefined();
  });
});
