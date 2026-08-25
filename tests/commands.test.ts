import { describe, expect, it } from "vitest";

import { commandPayload } from "../src/bot/commands.js";

describe("search command", () => {
  it("publishes search replies by exposing only the query option", () => {
    const search = commandPayload.find((command) => command.name === "search");

    expect(search?.options?.map((option) => option.name)).toEqual(["query"]);
  });
});
