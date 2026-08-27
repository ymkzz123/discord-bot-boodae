import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export interface KboAlertStateStore {
  has(key: string): Promise<boolean>;
  markSent(key: string): Promise<void>;
}

export class FileKboAlertStateStore implements KboAlertStateStore {
  private readonly sent = new Set<string>();
  private readonly loaded: Promise<void>;
  private writeQueue = Promise.resolve();

  constructor(private readonly filePath: string) {
    this.loaded = this.load();
  }

  async has(key: string): Promise<boolean> {
    await this.loaded;
    return this.sent.has(key);
  }

  async markSent(key: string): Promise<void> {
    await this.loaded;
    this.sent.add(key);
    this.writeQueue = this.writeQueue.then(() => this.persist());
    await this.writeQueue;
  }

  private async load(): Promise<void> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return;
      for (const key of parsed) {
        if (typeof key === "string") this.sent.add(key);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  private async persist(): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.tmp`;
    const recentKeys = [...this.sent].slice(-500);
    await writeFile(temporaryPath, JSON.stringify(recentKeys, null, 2), "utf8");
    await rename(temporaryPath, this.filePath);
  }
}
