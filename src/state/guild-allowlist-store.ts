import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { isDiscordSnowflake } from "../lib/discord-snowflake.js";

interface PersistedGuildAllowlist {
  version: 1;
  guildIds: string[];
}

export interface GuildAllowlistReader {
  has(guildId: string): boolean;
  list(): string[];
}

export interface GuildAllowlistStore extends GuildAllowlistReader {
  add(guildId: string): Promise<boolean>;
  remove(guildId: string): Promise<boolean>;
}

function parsePersistedAllowlist(raw: string): string[] {
  let value: unknown;
  try {
    value = JSON.parse(raw) as unknown;
  } catch (error) {
    throw new Error("Guild allowlist store contains invalid JSON", { cause: error });
  }

  if (
    typeof value !== "object" ||
    value === null ||
    (value as { version?: unknown }).version !== 1 ||
    !Array.isArray((value as { guildIds?: unknown }).guildIds)
  ) {
    throw new Error("Guild allowlist store has an invalid structure");
  }

  const guildIds = (value as PersistedGuildAllowlist).guildIds;
  const invalidGuildId = guildIds.find(
    (guildId) => typeof guildId !== "string" || !isDiscordSnowflake(guildId),
  );
  if (invalidGuildId !== undefined) {
    throw new Error("Guild allowlist store contains an invalid Discord server ID");
  }

  return [...new Set(guildIds)];
}

export class FileGuildAllowlistStore implements GuildAllowlistStore {
  private guildIds = new Set<string>();
  private mutationQueue = Promise.resolve();

  private constructor(private readonly filePath: string) {}

  static async open(
    filePath: string,
    bootstrapGuildIds: readonly string[],
  ): Promise<FileGuildAllowlistStore> {
    const store = new FileGuildAllowlistStore(filePath);
    await store.loadOrBootstrap(bootstrapGuildIds);
    return store;
  }

  has(guildId: string): boolean {
    return this.guildIds.has(guildId);
  }

  list(): string[] {
    return [...this.guildIds];
  }

  add(guildId: string): Promise<boolean> {
    return this.enqueueMutation(async () => {
      if (this.guildIds.has(guildId)) return false;

      const next = new Set(this.guildIds);
      next.add(guildId);
      await this.persist(next);
      this.guildIds = next;
      return true;
    });
  }

  remove(guildId: string): Promise<boolean> {
    return this.enqueueMutation(async () => {
      if (!this.guildIds.has(guildId)) return false;

      const next = new Set(this.guildIds);
      next.delete(guildId);
      await this.persist(next);
      this.guildIds = next;
      return true;
    });
  }

  private async loadOrBootstrap(bootstrapGuildIds: readonly string[]): Promise<void> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      this.guildIds = new Set(parsePersistedAllowlist(raw));
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }

    if (bootstrapGuildIds.length === 0) {
      throw new Error(
        "Guild allowlist store does not exist and DISCORD_ALLOWED_GUILD_IDS is empty",
      );
    }

    const initial = new Set(bootstrapGuildIds);
    await this.persist(initial);
    this.guildIds = initial;
  }

  private enqueueMutation<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.mutationQueue.then(operation);
    this.mutationQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private async persist(guildIds: ReadonlySet<string>): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.${process.pid}.${randomUUID()}.tmp`;
    const payload: PersistedGuildAllowlist = {
      version: 1,
      guildIds: [...guildIds],
    };

    try {
      await writeFile(temporaryPath, `${JSON.stringify(payload, null, 2)}\n`, {
        encoding: "utf8",
        flag: "wx",
        mode: 0o600,
      });
      await rename(temporaryPath, this.filePath);
    } catch (error) {
      await unlink(temporaryPath).catch(() => undefined);
      throw error;
    }
  }
}
