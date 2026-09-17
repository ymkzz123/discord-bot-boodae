import { Client, Events, GatewayIntentBits, type Guild } from "discord.js";

import type { Logger } from "../lib/logger.js";
import { createInteractionHandler, type InteractionDependencies } from "./interaction-handler.js";

export async function enforceGuildAccess(
  guild: Guild,
  dependencies: Pick<InteractionDependencies, "guildAllowlist" | "commandSynchronizer">,
  logger: Logger,
): Promise<void> {
  if (dependencies.guildAllowlist.has(guild.id)) {
    try {
      await dependencies.commandSynchronizer.synchronize(guild.id);
      logger.info("Synchronized commands in allowed guild", { guildId: guild.id });
    } catch (error) {
      logger.error("Failed to synchronize commands in allowed guild", {
        guildId: guild.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }

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

export function createBot(
  dependencies: InteractionDependencies,
  logger: Logger,
): Client {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  const handleInteraction = createInteractionHandler(dependencies);

  client.once(Events.ClientReady, (readyClient) => {
    logger.info("Discord bot is ready", {
      botUser: readyClient.user.tag,
      guildCount: readyClient.guilds.cache.size,
      allowedGuildIds: dependencies.guildAllowlist.list(),
    });

    for (const guild of readyClient.guilds.cache.values()) {
      void enforceGuildAccess(guild, dependencies, logger);
    }
  });

  client.on(Events.GuildCreate, (guild) => {
    void enforceGuildAccess(guild, dependencies, logger);
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
