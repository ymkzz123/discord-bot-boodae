import { z } from "zod";

import { AsyncTtlCache } from "../lib/async-ttl-cache.js";
import { JsonHttpClient } from "../scraping/json-http-client.js";
import { KboError } from "./kbo-error.js";
import { resolveKboTeamCode } from "./teams.js";
import type {
  KboAlertDataProvider,
  KboCurrentPitcher,
  KboDataProvider,
  KboGameLineup,
  KboLineupPlayer,
  KboScheduledGame,
  KboTeamLineup,
} from "./types.js";

const NAVER_SPORTS_API = "https://api-gw.sports.naver.com";

const apiEnvelopeSchema = <T extends z.ZodType>(result: T) =>
  z.object({
    code: z.number(),
    success: z.boolean(),
    result,
  });

const scheduleGameSchema = z.object({
  gameId: z.string().min(1),
  categoryId: z.string(),
  gameDate: z.string(),
  gameDateTime: z.string(),
  homeTeamCode: z.string(),
  homeTeamName: z.string(),
  awayTeamCode: z.string(),
  awayTeamName: z.string(),
  statusCode: z.string(),
  statusInfo: z.string().nullish(),
  cancel: z.boolean().nullish(),
  suspended: z.boolean().nullish(),
  stadium: z.string().nullish(),
});

const scheduleEnvelopeSchema = apiEnvelopeSchema(
  z.object({ games: z.array(scheduleGameSchema) }),
);

const previewPlayerSchema = z.object({
  playerName: z.string(),
  positionName: z.string().nullish(),
});

const previewTeamLineupSchema = z.object({
  fullLineUp: z.array(previewPlayerSchema).nullish(),
}).nullish();

const starterSchema = z.object({
  playerInfo: z.object({ name: z.string() }).nullish(),
}).nullish();

const previewEnvelopeSchema = apiEnvelopeSchema(
  z.object({
    previewData: z.object({
      gameInfo: z.object({ stadium: z.string().nullish() }).nullish(),
      homeTeamLineUp: previewTeamLineupSchema,
      awayTeamLineUp: previewTeamLineupSchema,
      homeStarter: starterSchema,
      awayStarter: starterSchema,
    }).nullish(),
  }),
);

const relayPlayerSchema = z.object({
  name: z.string(),
  pcode: z.union([z.string(), z.number()]).transform(String).optional(),
  posName: z.string().nullish(),
  batOrder: z.number().int().nullish(),
  seqno: z.number().int().nullish(),
});

const relayLineupSchema = z.object({
  batter: z.array(relayPlayerSchema).nullish(),
  pitcher: z.array(relayPlayerSchema).nullish(),
});

const relayEnvelopeSchema = apiEnvelopeSchema(
  z.object({
    textRelayData: z.object({
      homeLineup: relayLineupSchema,
      awayLineup: relayLineupSchema,
      currentGameState: z.object({
        pitcher: z.union([z.string(), z.number()]).transform(String),
      }).nullish(),
      homeEntry: z.object({
        pitcher: z.array(z.object({
          name: z.string(),
          pcode: z.union([z.string(), z.number()]).transform(String),
        })).nullish(),
      }).nullish(),
      awayEntry: z.object({
        pitcher: z.array(z.object({
          name: z.string(),
          pcode: z.union([z.string(), z.number()]).transform(String),
        })).nullish(),
      }).nullish(),
    }).nullish(),
  }),
);

interface ApiEnvelope<T> {
  code: number;
  success: boolean;
  result: T;
}

function parseEnvelope<T>(
  schema: z.ZodType<ApiEnvelope<T>>,
  value: unknown,
  endpoint: string,
): ApiEnvelope<T> {
  const parsed = schema.safeParse(value);
  if (!parsed.success || !parsed.data.success) {
    throw new KboError(
      "KBO_INVALID_RESPONSE",
      `Naver Sports returned an invalid response for ${endpoint}`,
      { cause: parsed.success ? undefined : parsed.error },
    );
  }
  return parsed.data;
}

function isPitcherPosition(value: string | null | undefined): boolean {
  return Boolean(value?.includes("투수"));
}

function previewLineup(
  players: z.infer<typeof previewPlayerSchema>[] | null | undefined,
  starterName: string | null,
): KboTeamLineup {
  const all = players ?? [];
  const pitcher = all.find((player) => isPitcherPosition(player.positionName));
  const batters = all
    .filter((player) => !isPitcherPosition(player.positionName))
    .map((player, index): KboLineupPlayer => ({
      battingOrder: index + 1,
      name: player.playerName,
      position: player.positionName ?? null,
    }));

  return {
    startingPitcher: starterName ?? pitcher?.playerName ?? null,
    batters,
  };
}

function relayLineup(
  lineup: z.infer<typeof relayLineupSchema>,
  fallback: KboTeamLineup,
): KboTeamLineup {
  const byOrder = new Map<number, z.infer<typeof relayPlayerSchema>>();
  for (const player of lineup.batter ?? []) {
    if (!player.batOrder || player.batOrder < 1) continue;
    const existing = byOrder.get(player.batOrder);
    if (!existing || (player.seqno ?? 0) < (existing.seqno ?? 0)) {
      byOrder.set(player.batOrder, player);
    }
  }

  const batters = [...byOrder.entries()]
    .sort(([left], [right]) => left - right)
    .map(([battingOrder, player]): KboLineupPlayer => ({
      battingOrder,
      name: player.name,
      position: player.posName ?? null,
    }));
  const pitcher = (lineup.pitcher ?? [])[0];

  return {
    startingPitcher: pitcher?.name ?? fallback.startingPitcher,
    batters: batters.length > 0 ? batters : fallback.batters,
  };
}

export class NaverKboProvider implements KboDataProvider, KboAlertDataProvider {
  private readonly cache: AsyncTtlCache<unknown>;

  constructor(
    private readonly http: JsonHttpClient,
    private readonly timeoutMs: number,
    cacheTtlMs: number,
    now: () => number = Date.now,
  ) {
    this.cache = new AsyncTtlCache(cacheTtlMs, now);
  }

  async getSchedule(date: string): Promise<KboScheduledGame[]> {
    const endpoint = "/schedule/games";
    const url = new URL(endpoint, NAVER_SPORTS_API);
    url.search = new URLSearchParams({
      upperCategoryId: "kbaseball",
      categoryId: "kbo",
      fromDate: date,
      toDate: date,
      size: "100",
    }).toString();

    const raw = await this.request(`schedule:${date}`, url);
    const envelope = parseEnvelope(scheduleEnvelopeSchema, raw, endpoint);

    return envelope.result.games
      .filter((game) => game.categoryId === "kbo")
      .map((game): KboScheduledGame => ({
        gameId: game.gameId,
        gameDate: game.gameDate,
        gameDateTime: game.gameDateTime,
        stadium: game.stadium ?? null,
        statusCode: game.statusCode,
        statusText: game.statusInfo?.trim() || "상태 미정",
        cancelled: game.cancel ?? false,
        suspended: game.suspended ?? false,
        homeTeam: resolveKboTeamCode(game.homeTeamCode, game.homeTeamName),
        awayTeam: resolveKboTeamCode(game.awayTeamCode, game.awayTeamName),
      }));
  }

  async getLineup(game: KboScheduledGame): Promise<KboGameLineup> {
    if (game.cancelled) {
      const empty = { startingPitcher: null, batters: [] } satisfies KboTeamLineup;
      return { game, home: empty, away: empty, published: false };
    }

    return this.cache.getOrLoad(`lineup:${game.gameId}`, async () => {
      const previewEndpoint = `/schedule/games/${encodeURIComponent(game.gameId)}/preview`;
      const previewRaw = await this.request(
        `preview:${game.gameId}`,
        new URL(previewEndpoint, NAVER_SPORTS_API),
      );
      const preview = parseEnvelope(previewEnvelopeSchema, previewRaw, previewEndpoint)
        .result.previewData;

      const homeFallback = previewLineup(
        preview?.homeTeamLineUp?.fullLineUp,
        preview?.homeStarter?.playerInfo?.name ?? null,
      );
      const awayFallback = previewLineup(
        preview?.awayTeamLineUp?.fullLineUp,
        preview?.awayStarter?.playerInfo?.name ?? null,
      );

      let home = homeFallback;
      let away = awayFallback;
      if (game.statusCode !== "BEFORE" && game.statusCode !== "READY") {
        const relayEndpoint = `/schedule/games/${encodeURIComponent(game.gameId)}/relay`;
        const relayRaw = await this.request(
          `relay:${game.gameId}`,
          new URL(relayEndpoint, NAVER_SPORTS_API),
        );
        const relay = parseEnvelope(relayEnvelopeSchema, relayRaw, relayEndpoint)
          .result.textRelayData;
        if (relay) {
          home = relayLineup(relay.homeLineup, homeFallback);
          away = relayLineup(relay.awayLineup, awayFallback);
        }
      }

      const stadium = preview?.gameInfo?.stadium?.trim() || game.stadium;
      return {
        game: { ...game, stadium },
        home,
        away,
        published: home.batters.length >= 9 && away.batters.length >= 9,
      };
    }) as Promise<KboGameLineup>;
  }

  async getCurrentPitcher(game: KboScheduledGame): Promise<KboCurrentPitcher | null> {
    if (game.statusCode !== "STARTED" || game.cancelled || game.suspended) return null;

    const relayEndpoint = `/schedule/games/${encodeURIComponent(game.gameId)}/relay`;
    const relayRaw = await this.request(
      `relay:${game.gameId}`,
      new URL(relayEndpoint, NAVER_SPORTS_API),
    );
    const relay = parseEnvelope(relayEnvelopeSchema, relayRaw, relayEndpoint).result.textRelayData;
    const playerCode = relay?.currentGameState?.pitcher;
    if (!relay || !playerCode) return null;

    const homePitchers = [
      ...(relay.homeLineup.pitcher ?? []),
      ...(relay.homeEntry?.pitcher ?? []),
    ];
    const awayPitchers = [
      ...(relay.awayLineup.pitcher ?? []),
      ...(relay.awayEntry?.pitcher ?? []),
    ];
    const homePitcher = homePitchers.find((pitcher) => pitcher.pcode === playerCode);
    if (homePitcher) {
      return {
        gameId: game.gameId,
        playerCode,
        name: homePitcher.name,
        team: game.homeTeam,
      };
    }
    const awayPitcher = awayPitchers.find((pitcher) => pitcher.pcode === playerCode);
    if (awayPitcher) {
      return {
        gameId: game.gameId,
        playerCode,
        name: awayPitcher.name,
        team: game.awayTeam,
      };
    }
    return null;
  }

  private async request(cacheKey: string, url: URL): Promise<unknown> {
    try {
      return await this.cache.getOrLoad(cacheKey, () =>
        this.http.getJson(url, { signal: AbortSignal.timeout(this.timeoutMs) }),
      );
    } catch (error) {
      if (error instanceof KboError) throw error;
      throw new KboError(
        "KBO_UPSTREAM_FAILED",
        `Failed to request Naver Sports: ${url.pathname}`,
        { cause: error },
      );
    }
  }
}
