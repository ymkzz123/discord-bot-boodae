import { DiscordGuildCommandSynchronizer } from "../src/bot/guild-command-synchronizer.js";
import { loadRegistrationConfig } from "../src/config/env.js";
import { FileGuildAllowlistStore } from "../src/state/guild-allowlist-store.js";

const config = loadRegistrationConfig();
const allowlist = await FileGuildAllowlistStore.open(
  config.allowlistStorePath,
  config.discordBootstrapGuildIds,
);
const guildIds = allowlist.list();
const synchronizer = new DiscordGuildCommandSynchronizer(
  config.discordClientId,
  config.discordToken,
);

console.log(
  `Registering commands in ${guildIds.length} allowed guild(s)...`,
);

for (const guildId of guildIds) {
  await synchronizer.synchronize(guildId);
  console.log(`Registered commands in guild ${guildId}.`);
}

console.log("Registered guild commands successfully.");
