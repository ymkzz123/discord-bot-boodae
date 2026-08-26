import { buildBotInviteUrl } from "../src/bot/invite-url.js";
import { loadInviteConfig } from "../src/config/env.js";

const config = loadInviteConfig();

for (const guildId of config.discordAllowedGuildIds) {
  console.log(`Guild ${guildId}:`);
  console.log(buildBotInviteUrl({ clientId: config.discordClientId, guildId }));
}
