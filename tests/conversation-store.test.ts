import { describe, expect, it } from "vitest";

import { ConversationStore } from "../src/state/conversation-store.js";

describe("ConversationStore", () => {
  it("expires response IDs after the configured TTL", () => {
    let now = 1_000;
    const store = new ConversationStore(500, () => now);

    store.set("user", "resp_123");
    expect(store.get("user")).toBe("resp_123");

    now = 1_500;
    expect(store.get("user")).toBeUndefined();
  });

  it("deletes a conversation explicitly", () => {
    const store = new ConversationStore(500);
    store.set("user", "resp_123");

    expect(store.delete("user")).toBe(true);
    expect(store.get("user")).toBeUndefined();
  });
});
