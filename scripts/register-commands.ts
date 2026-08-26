import { REST, Routes } from "discord.js";

import { commandPayload } from "../src/bot/commands.js";
import { loadRegistrationConfig } from "../src/config/env.js";

const config = loadRegistrationConfig();
const rest = new REST({ version: "10" }).setToken(config.discordToken);

console.log(
  `Registering commands in ${config.discordAllowedGuildIds.length} allowed guild(s)...`,
);

for (const guildId of config.discordAllowedGuildIds) {
  await rest.put(
    Routes.applicationGuildCommands(config.discordClientId, guildId),
    { body: commandPayload },
  );
  console.log(`Registered commands in guild ${guildId}.`);
}

console.log(`Registered ${commandPayload.length} commands successfully.`);
