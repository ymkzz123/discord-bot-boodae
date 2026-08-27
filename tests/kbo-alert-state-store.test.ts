import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { FileKboAlertStateStore } from "../src/state/kbo-alert-state-store.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
  );
});

describe("FileKboAlertStateStore", () => {
  it("persists sent event keys across monitor restarts", async () => {
    const directory = await mkdtemp(join(tmpdir(), "boodae-kbo-alert-"));
    temporaryDirectories.push(directory);
    const file = join(directory, "nested", "state.json");
    const first = new FileKboAlertStateStore(file);

    expect(await first.has("game:channel")).toBe(false);
    await first.markSent("game:channel");

    const restarted = new FileKboAlertStateStore(file);
    expect(await restarted.has("game:channel")).toBe(true);
  });
});
