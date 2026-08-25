import {
  MessageFlags,
  type ChatInputCommandInteraction,
  type Interaction,
} from "discord.js";

import { splitDiscordMessage, truncateWithNotice } from "../lib/discord-message.js";
import { serializeError, type Logger } from "../lib/logger.js";
import type { WebSearchService } from "../openai/web-search-service.js";
import type { FixedWindowRateLimiter } from "../security/rate-limiter.js";
import type { ConversationStore } from "../state/conversation-store.js";

export interface InteractionDependencies {
  searchService: WebSearchService;
  conversations: ConversationStore;
  rateLimiter: FixedWindowRateLimiter;
  logger: Logger;
  maxResponseChars: number;
}

function conversationKey(interaction: ChatInputCommandInteraction): string {
  return [
    interaction.guildId ?? "dm",
    interaction.channelId,
    interaction.user.id,
  ].join(":");
}

async function replyWithoutMentions(
  interaction: ChatInputCommandInteraction,
  content: string,
  ephemeral = true,
): Promise<void> {
  await interaction.reply({
    content,
    allowedMentions: { parse: [] },
    ...(ephemeral ? { flags: MessageFlags.Ephemeral } : {}),
  });
}

async function handleSearch(
  interaction: ChatInputCommandInteraction,
  dependencies: InteractionDependencies,
): Promise<void> {
  const query = interaction.options.getString("query", true).trim();
  const isPrivate = interaction.options.getBoolean("private") ?? true;
  const limit = dependencies.rateLimiter.consume(interaction.user.id);

  if (!limit.allowed) {
    await replyWithoutMentions(
      interaction,
      `검색 요청이 너무 빠릅니다. 약 ${limit.retryAfterSeconds}초 뒤에 다시 시도해 주세요.`,
      true,
    );
    return;
  }

  await interaction.deferReply({
    ...(isPrivate ? { flags: MessageFlags.Ephemeral } : {}),
  });

  const key = conversationKey(interaction);
  const previousResponseId = dependencies.conversations.get(key);
  const startedAt = Date.now();

  try {
    const answer = await dependencies.searchService.search(query, {
      ...(previousResponseId ? { previousResponseId } : {}),
    });

    dependencies.conversations.set(key, answer.responseId);

    const content = truncateWithNotice(answer.markdown, dependencies.maxResponseChars);
    const chunks = splitDiscordMessage(content);
    const [firstChunk, ...additionalChunks] = chunks;

    await interaction.editReply({
      content: firstChunk ?? "응답을 표시할 수 없습니다.",
      allowedMentions: { parse: [] },
    });

    for (const chunk of additionalChunks) {
      await interaction.followUp({
        content: chunk,
        allowedMentions: { parse: [] },
        ...(isPrivate ? { flags: MessageFlags.Ephemeral } : {}),
      });
    }

    dependencies.logger.info("Search completed", {
      userId: interaction.user.id,
      guildId: interaction.guildId,
      sourceCount: answer.sourceCount,
      durationMs: Date.now() - startedAt,
      continuedConversation: Boolean(previousResponseId),
    });
  } catch (error) {
    dependencies.logger.error("Search failed", {
      userId: interaction.user.id,
      guildId: interaction.guildId,
      durationMs: Date.now() - startedAt,
      ...serializeError(error),
    });

    await interaction.editReply({
      content:
        "검색 중 문제가 발생했습니다. 잠시 뒤 다시 시도해 주세요. 계속 실패하면 봇 운영자에게 로그 확인을 요청해 주세요.",
      allowedMentions: { parse: [] },
    });
  }
}

export function createInteractionHandler(dependencies: InteractionDependencies) {
  return async (interaction: Interaction): Promise<void> => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "search") {
      await handleSearch(interaction, dependencies);
      return;
    }

    if (interaction.commandName === "reset") {
      const removed = dependencies.conversations.delete(conversationKey(interaction));
      await replyWithoutMentions(
        interaction,
        removed
          ? "현재 채널의 내 후속 대화 문맥을 초기화했습니다."
          : "초기화할 후속 대화 문맥이 없습니다.",
      );
      return;
    }

    if (interaction.commandName === "ping") {
      await replyWithoutMentions(interaction, `정상 작동 중입니다. (${interaction.client.ws.ping}ms)`);
    }
  };
}
