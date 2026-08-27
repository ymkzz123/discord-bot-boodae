import type { Logger } from "../lib/logger.js";
import type { KboAlertStateStore } from "../state/kbo-alert-state-store.js";
import { formatKoreanDate } from "./kbo-lineup-service.js";
import type { KboAlertDataProvider, KboScheduledGame } from "./types.js";

export type KboAlertEvent =
  | { type: "PLAYBALL"; key: string }
  | { type: "KIM_SEOHYUN"; key: string };

export interface KboAlertNotifier {
  readonly channelIds: readonly string[];
  send(channelId: string, event: KboAlertEvent): Promise<void>;
}

function gameStartTimestamp(game: KboScheduledGame): number | null {
  const value = game.gameDateTime.match(/[zZ]|[+-]\d\d:\d\d$/)
    ? game.gameDateTime
    : `${game.gameDateTime}+09:00`;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function buildPlayballEvents(
  schedule: KboScheduledGame[],
  now: Date,
  graceMs: number,
): KboAlertEvent[] {
  const startTimes = new Set<string>();
  for (const game of schedule) {
    if (game.cancelled || game.suspended) continue;
    const start = gameStartTimestamp(game);
    if (start === null) continue;
    const elapsed = now.getTime() - start;
    if (elapsed < 0 || elapsed > graceMs) continue;
    startTimes.add(game.gameDateTime);
  }
  return [...startTimes].map((startTime) => ({
    type: "PLAYBALL" as const,
    key: `playball:${startTime}`,
  }));
}

export class KboAlertMonitor {
  private timer: NodeJS.Timeout | undefined;
  private running = false;

  constructor(
    private readonly provider: KboAlertDataProvider,
    private readonly notifier: KboAlertNotifier,
    private readonly state: KboAlertStateStore,
    private readonly logger: Logger,
    private readonly activePollMs: number,
    private readonly idlePollMs: number,
    private readonly playballGraceMs: number,
    private readonly now: () => Date = () => new Date(),
  ) {}

  start(): void {
    if (this.running || this.notifier.channelIds.length === 0) return;
    this.running = true;
    this.logger.info("KBO alert monitor started", {
      channelCount: this.notifier.channelIds.length,
      activePollMs: this.activePollMs,
    });
    void this.runLoop();
  }

  stop(): void {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
  }

  async pollOnce(): Promise<number> {
    const now = this.now();
    const date = formatKoreanDate(now);
    const schedule = await this.provider.getSchedule(date);
    const events = buildPlayballEvents(schedule, now, this.playballGraceMs);

    for (const game of schedule) {
      const involvesHanwha = game.homeTeam.code === "HH" || game.awayTeam.code === "HH";
      if (!involvesHanwha || game.statusCode !== "STARTED" || game.cancelled || game.suspended) {
        continue;
      }
      const currentPitcher = await this.provider.getCurrentPitcher(game);
      if (currentPitcher?.team.code === "HH" && currentPitcher.name === "김서현") {
        events.push({
          type: "KIM_SEOHYUN",
          key: `kim-seohyun:${game.gameId}:${currentPitcher.playerCode}`,
        });
      }
    }

    for (const event of events) {
      for (const channelId of this.notifier.channelIds) {
        const stateKey = `${event.key}:channel:${channelId}`;
        if (await this.state.has(stateKey)) continue;
        try {
          await this.notifier.send(channelId, event);
          await this.state.markSent(stateKey);
          this.logger.info("KBO alert sent", {
            eventType: event.type,
            channelId,
          });
        } catch (error) {
          this.logger.error("KBO alert delivery failed", {
            eventType: event.type,
            channelId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    const activeOrSoon = schedule.some((game) => {
      if (game.cancelled || game.suspended || game.statusCode === "STARTED") {
        return game.statusCode === "STARTED";
      }
      const start = gameStartTimestamp(game);
      if (start === null) return false;
      const untilStart = start - now.getTime();
      return untilStart >= 0 && untilStart <= 60 * 60_000;
    });
    return activeOrSoon ? this.activePollMs : this.idlePollMs;
  }

  private async runLoop(): Promise<void> {
    let delay = this.idlePollMs;
    try {
      delay = await this.pollOnce();
    } catch (error) {
      this.logger.error("KBO alert polling failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    if (!this.running) return;
    this.timer = setTimeout(() => void this.runLoop(), delay);
    this.timer.unref();
  }
}
