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
  OPENAI_API_KEY: z.string().min(20, "OPENAI_API_KEY is missing or too short"),
  OPENAI_MODEL: z.string().min(1).default("gpt-5.5"),
  SEARCH_TIMEOUT_MS: z.coerce.number().int().min(5_000).max(120_000).default(60_000),
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
    openAiApiKey: env.OPENAI_API_KEY,
    openAiModel: env.OPENAI_MODEL,
    searchTimeoutMs: env.SEARCH_TIMEOUT_MS,
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
