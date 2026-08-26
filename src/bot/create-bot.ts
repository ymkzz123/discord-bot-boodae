import { Client, Events, GatewayIntentBits, type Guild } from "discord.js";

import type { Logger } from "../lib/logger.js";
import { createInteractionHandler, type InteractionDependencies } from "./interaction-handler.js";

export function createBot(
  dependencies: InteractionDependencies,
  logger: Logger,
): Client {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  const handleInteraction = createInteractionHandler(dependencies);

  async function leaveUnauthorizedGuild(guild: Guild): Promise<void> {
    if (guild.id === dependencies.allowedGuildId) return;

    logger.warn("Leaving unauthorized guild", {
      guildId: guild.id,
      guildName: guild.name,
    });

    try {
      await guild.leave();
      logger.info("Left unauthorized guild", { guildId: guild.id });
    } catch (error) {
      logger.error("Failed to leave unauthorized guild", {
        guildId: guild.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  client.once(Events.ClientReady, (readyClient) => {
    logger.info("Discord bot is ready", {
      botUser: readyClient.user.tag,
      guildCount: readyClient.guilds.cache.size,
      allowedGuildId: dependencies.allowedGuildId,
    });

    for (const guild of readyClient.guilds.cache.values()) {
      void leaveUnauthorizedGuild(guild);
    }
  });

  client.on(Events.GuildCreate, (guild) => {
    void leaveUnauthorizedGuild(guild);
  });

  client.on(Events.InteractionCreate, (interaction) => {
    void handleInteraction(interaction).catch((error: unknown) => {
      logger.error("Unhandled interaction error", {
        error: error instanceof Error ? error.message : String(error),
      });
    });
  });

  client.on(Events.Error, (error) => {
    logger.error("Discord client error", {
      errorName: error.name,
      errorMessage: error.message,
    });
  });

  return client;
}
