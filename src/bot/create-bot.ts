import { Client, Events, GatewayIntentBits } from "discord.js";

import type { Logger } from "../lib/logger.js";
import { createInteractionHandler, type InteractionDependencies } from "./interaction-handler.js";

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
    });
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
