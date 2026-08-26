import "dotenv/config";

import { z } from "zod";

const snowflake = z.string().regex(/^\d+$/, "Discord ID must contain digits only");

const discordIdentitySchema = z.object({
  DISCORD_CLIENT_ID: snowflake,
  DISCORD_GUILD_ID: z.union([snowflake, z.literal("")]).optional(),
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

export function loadRuntimeConfig() {
  const env = runtimeSchema.parse(process.env);

  return {
    discordClientId: env.DISCORD_CLIENT_ID,
    discordToken: env.DISCORD_TOKEN,
    discordGuildId: normalizeGuildId(env.DISCORD_GUILD_ID),
    geminiApiKey: env.GEMINI_API_KEY,
    geminiModel: env.GEMINI_MODEL,
    searchTimeoutMs: env.SEARCH_TIMEOUT_MS,
    searchMaxResults: env.SEARCH_MAX_RESULTS,
    kboTimeoutMs: env.KBO_TIMEOUT_MS,
    kboCacheTtlMs: env.KBO_CACHE_SECONDS * 1_000,
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
    discordGuildId: normalizeGuildId(env.DISCORD_GUILD_ID),
  };
}

export function loadInviteConfig() {
  const env = discordIdentitySchema.parse(process.env);

  return {
    discordClientId: env.DISCORD_CLIENT_ID,
    discordGuildId: normalizeGuildId(env.DISCORD_GUILD_ID),
  };
}
