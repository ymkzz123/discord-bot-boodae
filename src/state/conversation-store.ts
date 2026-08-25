import type { ConversationTurn } from "../search/types.js";

interface ConversationEntry {
  turn: ConversationTurn;
  expiresAt: number;
}

export class ConversationStore {
  readonly #entries = new Map<string, ConversationEntry>();

  constructor(
    private readonly ttlMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  get(key: string): ConversationTurn | undefined {
    const entry = this.#entries.get(key);
    if (!entry) return undefined;

    if (entry.expiresAt <= this.now()) {
      this.#entries.delete(key);
      return undefined;
    }

    return entry.turn;
  }

  set(key: string, turn: ConversationTurn): void {
    this.#entries.set(key, {
      turn,
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
