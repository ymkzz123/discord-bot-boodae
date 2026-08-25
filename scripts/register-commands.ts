import { REST, Routes } from "discord.js";

import { commandPayload } from "../src/bot/commands.js";
import { loadRegistrationConfig } from "../src/config/env.js";

const config = loadRegistrationConfig();
const rest = new REST({ version: "10" }).setToken(config.discordToken);

const route = config.discordGuildId
  ? Routes.applicationGuildCommands(config.discordClientId, config.discordGuildId)
  : Routes.applicationCommands(config.discordClientId);

console.log(
  config.discordGuildId
    ? `Registering commands in development guild ${config.discordGuildId}...`
    : "Registering global commands...",
);

await rest.put(route, { body: commandPayload });

console.log(`Registered ${commandPayload.length} commands successfully.`);
