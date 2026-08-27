import "dotenv/config";

import { z } from "zod";

const snowflake = z.string().regex(/^\d+$/, "Discord ID must contain digits only");

const discordIdentitySchema = z.object({
  DISCORD_CLIENT_ID: snowflake,
  DISCORD_GUILD_ID: z.union([snowflake, z.literal("")]).optional(),
  DISCORD_ALLOWED_GUILD_IDS: z.string().optional(),
});

const sharedSchema = discordIdentitySchema.extend({
  DISCORD_TOKEN: z.string().min(20, "DISCORD_TOKEN is missing or too short"),
});

const runtimeSchema = sharedSchema.extend({
  GEMINI_API_KEY: z.string().min(20, "GEMINI_API_KEY is missing or too short"),
  GEMINI_MODEL: z.string().min(1).default("gemini-3.1-flash-lite"),
  SEARCH_TIMEOUT_MS: z.coerce.number().int().min(5_000).max(120_000).default(60_000),
  SEARCH_MAX_RESULTS: z.coerce.number().int().min(1).max(10).default(5),
  KBO_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(30_000).default(10_000),
  KBO_CACHE_SECONDS: z.coerce.number().int().min(5).max(300).default(30),
  KBO_ALERT_CHANNEL_IDS: z.string().optional(),
  KBO_ALERT_ROLE_NAME: z.string().trim().min(1).max(100).default("야구"),
  KBO_ALERT_ACTIVE_POLL_SECONDS: z.coerce.number().int().min(15).max(300).default(30),
  KBO_ALERT_IDLE_POLL_SECONDS: z.coerce.number().int().min(60).max(3_600).default(300),
  KBO_PLAYBALL_GRACE_MINUTES: z.coerce.number().int().min(1).max(60).default(15),
  JUNGOL_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(30_000).default(10_000),
  JUNGOL_CACHE_SECONDS: z.coerce.number().int().min(30).max(3_600).default(300),
  CONVERSATION_TTL_MINUTES: z.coerce.number().int().min(1).max(1_440).default(30),
  RATE_LIMIT_REQUESTS: z.coerce.number().int().min(1).max(100).default(5),
  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().min(1).max(3_600).default(60),
  MAX_RESPONSE_CHARS: z.coerce.number().int().min(1_000).max(20_000).default(10_000),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type RuntimeConfig = ReturnType<typeof loadRuntimeConfig>;
export type RegistrationConfig = ReturnType<typeof loadRegistrationConfig>;
export type InviteConfig = ReturnType<typeof loadInviteConfig>;

function normalizeGuildId(value: string | undefined): string | undefined {
  return value?.trim() || undefined;
}

export function parseAllowedGuildIds(
  value: string | undefined,
  legacyGuildId?: string,
): string[] {
  const candidates = [
    ...(value?.split(",") ?? []),
    ...(legacyGuildId ? [legacyGuildId] : []),
  ]
    .map((guildId) => guildId.trim())
    .filter(Boolean);
  const uniqueGuildIds = [...new Set(candidates)];

  const invalidGuildId = uniqueGuildIds.find((guildId) => !/^\d+$/.test(guildId));
  if (invalidGuildId) {
    throw new Error(
      `DISCORD_ALLOWED_GUILD_IDS contains an invalid Discord server ID: ${invalidGuildId}`,
    );
  }

  if (uniqueGuildIds.length === 0) {
    throw new Error(
      "DISCORD_ALLOWED_GUILD_IDS is required because this bot only runs in allowed Discord servers",
    );
  }

  return uniqueGuildIds;
}

export function parseOptionalDiscordIds(value: string | undefined, variableName: string): string[] {
  const ids = [...new Set((value?.split(",") ?? []).map((id) => id.trim()).filter(Boolean))];
  const invalidId = ids.find((id) => !/^\d+$/.test(id));
  if (invalidId) {
    throw new Error(`${variableName} contains an invalid Discord ID: ${invalidId}`);
  }
  return ids;
}

export function loadRuntimeConfig() {
  const env = runtimeSchema.parse(process.env);
  const discordAllowedGuildIds = parseAllowedGuildIds(
    env.DISCORD_ALLOWED_GUILD_IDS,
    normalizeGuildId(env.DISCORD_GUILD_ID),
  );

  return {
    discordClientId: env.DISCORD_CLIENT_ID,
    discordToken: env.DISCORD_TOKEN,
    discordAllowedGuildIds,
    geminiApiKey: env.GEMINI_API_KEY,
    geminiModel: env.GEMINI_MODEL,
    searchTimeoutMs: env.SEARCH_TIMEOUT_MS,
    searchMaxResults: env.SEARCH_MAX_RESULTS,
    kboTimeoutMs: env.KBO_TIMEOUT_MS,
    kboCacheTtlMs: env.KBO_CACHE_SECONDS * 1_000,
    kboAlertChannelIds: parseOptionalDiscordIds(
      env.KBO_ALERT_CHANNEL_IDS,
      "KBO_ALERT_CHANNEL_IDS",
    ),
    kboAlertRoleName: env.KBO_ALERT_ROLE_NAME,
    kboAlertActivePollMs: env.KBO_ALERT_ACTIVE_POLL_SECONDS * 1_000,
    kboAlertIdlePollMs: env.KBO_ALERT_IDLE_POLL_SECONDS * 1_000,
    kboPlayballGraceMs: env.KBO_PLAYBALL_GRACE_MINUTES * 60_000,
    jungolTimeoutMs: env.JUNGOL_TIMEOUT_MS,
    jungolCacheTtlMs: env.JUNGOL_CACHE_SECONDS * 1_000,
    conversationTtlMs: env.CONVERSATION_TTL_MINUTES * 60_000,
    rateLimitRequests: env.RATE_LIMIT_REQUESTS,
    rateLimitWindowMs: env.RATE_LIMIT_WINDOW_SECONDS * 1_000,
    maxResponseChars: env.MAX_RESPONSE_CHARS,
    logLevel: env.LOG_LEVEL,
  };
}

export function loadRegistrationConfig() {
  const env = sharedSchema.parse(process.env);

  return {
    discordClientId: env.DISCORD_CLIENT_ID,
    discordToken: env.DISCORD_TOKEN,
    discordAllowedGuildIds: parseAllowedGuildIds(
      env.DISCORD_ALLOWED_GUILD_IDS,
      normalizeGuildId(env.DISCORD_GUILD_ID),
    ),
  };
}

export function loadInviteConfig() {
  const env = discordIdentitySchema.parse(process.env);

  return {
    discordClientId: env.DISCORD_CLIENT_ID,
    discordAllowedGuildIds: parseAllowedGuildIds(
      env.DISCORD_ALLOWED_GUILD_IDS,
      normalizeGuildId(env.DISCORD_GUILD_ID),
    ),
  };
}
