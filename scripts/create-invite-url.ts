import { buildBotInviteUrl } from "../src/bot/invite-url.js";
import { loadInviteConfig } from "../src/config/env.js";

const config = loadInviteConfig();

console.log(
  buildBotInviteUrl({
    clientId: config.discordClientId,
    ...(config.discordGuildId ? { guildId: config.discordGuildId } : {}),
  }),
);
