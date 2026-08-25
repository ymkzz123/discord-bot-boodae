interface ConversationEntry {
  responseId: string;
  expiresAt: number;
}

export class ConversationStore {
  readonly #entries = new Map<string, ConversationEntry>();

  constructor(
    private readonly ttlMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  get(key: string): string | undefined {
    const entry = this.#entries.get(key);
    if (!entry) return undefined;

    if (entry.expiresAt <= this.now()) {
      this.#entries.delete(key);
      return undefined;
    }

    return entry.responseId;
  }

  set(key: string, responseId: string): void {
    this.#entries.set(key, {
      responseId,
      expiresAt: this.now() + this.ttlMs,
    });
  }

  delete(key: string): boolean {
    return this.#entries.delete(key);
  }

  sweep(): number {
    const now = this.now();
    let removed = 0;

    for (const [key, entry] of this.#entries) {
      if (entry.expiresAt <= now) {
        this.#entries.delete(key);
        removed += 1;
      }
    }

    return removed;
  }
}
