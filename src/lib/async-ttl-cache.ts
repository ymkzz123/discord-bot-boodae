interface CacheEntry<T> {
  expiresAt: number;
  value: Promise<T>;
}

export class AsyncTtlCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>();

  constructor(
    private readonly ttlMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  async getOrLoad(key: string, loader: () => Promise<T>): Promise<T> {
    const existing = this.entries.get(key);
    if (existing && existing.expiresAt > this.now()) return existing.value;

    const value = loader();
    const entry = { expiresAt: this.now() + this.ttlMs, value };
    this.entries.set(key, entry);

    try {
      return await value;
    } catch (error) {
      if (this.entries.get(key) === entry) this.entries.delete(key);
      throw error;
    }
  }

  sweep(): number {
    const now = this.now();
    let removed = 0;

    for (const [key, entry] of this.entries) {
      if (entry.expiresAt > now) continue;
      this.entries.delete(key);
      removed += 1;
    }

    return removed;
  }
}
