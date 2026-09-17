import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { FileGuildAllowlistStore } from "../src/state/guild-allowlist-store.js";

const GUILD_ID_1 = "111111111111111111";
const GUILD_ID_2 = "222222222222222222";

const temporaryDirectories: string[] = [];

async function temporaryStorePath(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "discord-allowlist-"));
  temporaryDirectories.push(directory);
  return join(directory, "nested", "guild-allowlist.json");
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) =>
    rm(directory, { recursive: true, force: true })
  ));
});

describe("FileGuildAllowlistStore", () => {
  it("bootstraps once from DISCORD_ALLOWED_GUILD_IDS and persists reloads", async () => {
    const filePath = await temporaryStorePath();
    const store = await FileGuildAllowlistStore.open(filePath, [GUILD_ID_1]);

    expect(store.list()).toEqual([GUILD_ID_1]);
    expect(await store.add(GUILD_ID_2)).toBe(true);
    expect(await store.add(GUILD_ID_2)).toBe(false);

    const reloaded = await FileGuildAllowlistStore.open(filePath, []);
    expect(reloaded.list()).toEqual([GUILD_ID_1, GUILD_ID_2]);
    expect(JSON.parse(await readFile(filePath, "utf8"))).toEqual({
      version: 1,
      guildIds: [GUILD_ID_1, GUILD_ID_2],
    });
  });

  it("removes existing guilds and treats a missing guild as an idempotent no-op", async () => {
    const filePath = await temporaryStorePath();
    const store = await FileGuildAllowlistStore.open(filePath, [GUILD_ID_1]);

    expect(await store.remove(GUILD_ID_2)).toBe(false);
    expect(await store.remove(GUILD_ID_1)).toBe(true);
    expect(store.list()).toEqual([]);
    expect((await FileGuildAllowlistStore.open(filePath, [GUILD_ID_2])).list()).toEqual([]);
  });

  it("fails closed when persistent data is malformed", async () => {
    const filePath = await temporaryStorePath();
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, "{not-json", "utf8");

    await expect(FileGuildAllowlistStore.open(filePath, [GUILD_ID_1])).rejects.toThrow(
      "invalid JSON",
    );
  });

  it("refuses to create an unbootstrapped store", async () => {
    const filePath = await temporaryStorePath();

    await expect(FileGuildAllowlistStore.open(filePath, [])).rejects.toThrow(
      "DISCORD_ALLOWED_GUILD_IDS is empty",
    );
  });
});
