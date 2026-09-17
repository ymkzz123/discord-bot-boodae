import { buildBotInviteUrl } from "../src/bot/invite-url.js";
import { loadInviteConfig } from "../src/config/env.js";
import { FileGuildAllowlistStore } from "../src/state/guild-allowlist-store.js";

const config = loadInviteConfig();
const allowlist = await FileGuildAllowlistStore.open(
  config.allowlistStorePath,
  config.discordBootstrapGuildIds,
);

for (const guildId of allowlist.list()) {
  console.log(`Guild ${guildId}:`);
  console.log(buildBotInviteUrl({ clientId: config.discordClientId, guildId }));
}
