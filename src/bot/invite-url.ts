import { PermissionFlagsBits } from "discord.js";

export interface BotInviteOptions {
  clientId: string;
  guildId?: string;
}

const REQUIRED_PERMISSIONS =
  PermissionFlagsBits.ViewChannel |
  PermissionFlagsBits.SendMessages |
  PermissionFlagsBits.SendMessagesInThreads;

export function buildBotInviteUrl(options: BotInviteOptions): string {
  const url = new URL("https://discord.com/oauth2/authorize");
  url.searchParams.set("client_id", options.clientId);
  url.searchParams.set("scope", "bot applications.commands");
  url.searchParams.set("permissions", REQUIRED_PERMISSIONS.toString());
  url.searchParams.set("integration_type", "0");

  if (options.guildId) {
    url.searchParams.set("guild_id", options.guildId);
    url.searchParams.set("disable_guild_select", "true");
  }

  return url.toString();
}
