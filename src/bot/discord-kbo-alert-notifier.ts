import type { Client } from "discord.js";

import type { KboAlertEvent, KboAlertNotifier } from "../kbo/kbo-alert-monitor.js";
import type { Logger } from "../lib/logger.js";

export class DiscordKboAlertNotifier implements KboAlertNotifier {
  constructor(
    private readonly client: Client,
    public readonly channelIds: readonly string[],
    private readonly allowedGuildIds: ReadonlySet<string>,
    private readonly roleName: string,
    private readonly logger: Logger,
  ) {}

  async send(channelId: string, event: KboAlertEvent): Promise<void> {
    const channel = await this.client.channels.fetch(channelId);
    if (!channel || !channel.isTextBased() || channel.isDMBased() || !channel.isSendable()) {
      throw new Error(`KBO alert channel ${channelId} is not a sendable guild text channel`);
    }
    if (!this.allowedGuildIds.has(channel.guildId)) {
      throw new Error(`KBO alert channel ${channelId} belongs to a guild outside the allowlist`);
    }

    const roles = await channel.guild.roles.fetch();
    const matches = roles.filter((role) => role.name === this.roleName);
    if (matches.size !== 1) {
      this.logger.warn("KBO alert role could not be resolved uniquely", {
        guildId: channel.guildId,
        channelId,
        roleName: this.roleName,
        matchCount: matches.size,
      });
      throw new Error(`Expected exactly one Discord role named ${this.roleName}`);
    }
    const role = matches.first();
    if (!role) throw new Error(`Discord role ${this.roleName} disappeared before sending`);

    const text = event.type === "PLAYBALL" ? "⚾ 플레이볼!" : "# 44 ALERT";
    await channel.send({
      content: `<@&${role.id}>\n${text}`,
      allowedMentions: { parse: [], roles: [role.id] },
    });
  }
}
