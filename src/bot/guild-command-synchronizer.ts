import { REST, Routes } from "discord.js";

import { commandPayload } from "./commands.js";

export interface GuildCommandSynchronizer {
  synchronize(guildId: string): Promise<void>;
  clear(guildId: string): Promise<void>;
}

export class DiscordGuildCommandSynchronizer implements GuildCommandSynchronizer {
  private readonly rest: REST;

  constructor(
    private readonly applicationId: string,
    discordToken: string,
  ) {
    this.rest = new REST({ version: "10" }).setToken(discordToken);
  }

  async synchronize(guildId: string): Promise<void> {
    await this.rest.put(
      Routes.applicationGuildCommands(this.applicationId, guildId),
      { body: commandPayload },
    );
  }

  async clear(guildId: string): Promise<void> {
    await this.rest.put(
      Routes.applicationGuildCommands(this.applicationId, guildId),
      { body: [] },
    );
  }
}
