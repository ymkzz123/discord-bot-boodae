import {
  MessageFlags,
  type ChatInputCommandInteraction,
  type Interaction,
} from "discord.js";

import { splitDiscordMessage, truncateWithNotice } from "../lib/discord-message.js";
import { serializeError, type Logger } from "../lib/logger.js";
import { getKboFailureMessage } from "../kbo/kbo-error.js";
import type { KboLineupServiceContract } from "../kbo/types.js";
import { getJungolFailureMessage } from "../jungol/jungol-error.js";
import type { JungolServiceContract } from "../jungol/types.js";
import { getSearchFailureMessage } from "../search/search-error.js";
import type { SearchService } from "../search/types.js";
import type { FixedWindowRateLimiter } from "../security/rate-limiter.js";
import type { ConversationStore } from "../state/conversation-store.js";
import { buildKboLineupEmbeds } from "./kbo-lineup-embeds.js";
import {
  buildJungolProblemEmbed,
  buildJungolTagEmbed,
  buildJungolUserEmbed,
} from "./jungol-embeds.js";

export interface InteractionDependencies {
  searchService: SearchService;
  kboLineupService: KboLineupServiceContract;
  jungolService: JungolServiceContract;
  pickKboPlayer: () => string;
  conversations: ConversationStore;
  rateLimiter: FixedWindowRateLimiter;
  logger: Logger;
  maxResponseChars: number;
  allowedGuildIds: ReadonlySet<string>;
}

function consumeRequestLimit(
  interaction: ChatInputCommandInteraction,
  dependencies: InteractionDependencies,
): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  return dependencies.rateLimiter.consume(interaction.user.id);
}

async function sendPublicChunks(
  interaction: ChatInputCommandInteraction,
  value: string,
  maxResponseChars: number,
): Promise<void> {
  const content = truncateWithNotice(value, maxResponseChars);
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
    });
  }
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
  const limit = consumeRequestLimit(interaction, dependencies);

  if (!limit.allowed) {
    await replyWithoutMentions(
      interaction,
      `검색 요청이 너무 빠릅니다. 약 ${limit.retryAfterSeconds}초 뒤에 다시 시도해 주세요.`,
      true,
    );
    return;
  }

  await interaction.deferReply();

  const key = conversationKey(interaction);
  const previousTurn = dependencies.conversations.get(key);
  const startedAt = Date.now();

  try {
    const answer = await dependencies.searchService.search(query, {
      ...(previousTurn ? { previousTurn } : {}),
    });

    dependencies.conversations.set(key, { query, answer: answer.markdown });

    await sendPublicChunks(interaction, answer.markdown, dependencies.maxResponseChars);

    dependencies.logger.info("Search completed", {
      userId: interaction.user.id,
      guildId: interaction.guildId,
      sourceCount: answer.sourceCount,
      durationMs: Date.now() - startedAt,
      continuedConversation: Boolean(previousTurn),
    });
  } catch (error) {
    dependencies.conversations.delete(key);
    dependencies.logger.error("Search failed", {
      userId: interaction.user.id,
      guildId: interaction.guildId,
      durationMs: Date.now() - startedAt,
      ...serializeError(error),
    });

    await interaction.editReply({
      content: getSearchFailureMessage(error),
      allowedMentions: { parse: [] },
    });
  }
}

async function handleLineup(
  interaction: ChatInputCommandInteraction,
  dependencies: InteractionDependencies,
): Promise<void> {
  const query = interaction.options.getString("query", true).trim();
  const limit = consumeRequestLimit(interaction, dependencies);

  if (!limit.allowed) {
    await replyWithoutMentions(
      interaction,
      `요청이 너무 빠릅니다. 약 ${limit.retryAfterSeconds}초 뒤에 다시 시도해 주세요.`,
      true,
    );
    return;
  }

  await interaction.deferReply();
  const startedAt = Date.now();

  try {
    const answer = await dependencies.kboLineupService.getToday(query);
    await interaction.editReply({
      embeds: buildKboLineupEmbeds(answer),
      allowedMentions: { parse: [] },
    });
    dependencies.logger.info("KBO lineup completed", {
      userId: interaction.user.id,
      guildId: interaction.guildId,
      teamCode: answer.requestedTeam.code,
      gameCount: answer.games.length,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    dependencies.logger.error("KBO lineup failed", {
      userId: interaction.user.id,
      guildId: interaction.guildId,
      durationMs: Date.now() - startedAt,
      ...serializeError(error),
    });
    await interaction.editReply({
      content: getKboFailureMessage(error),
      allowedMentions: { parse: [] },
    });
  }
}

async function handleJungol(
  interaction: ChatInputCommandInteraction,
  dependencies: InteractionDependencies,
): Promise<void> {
  const limit = consumeRequestLimit(interaction, dependencies);
  if (!limit.allowed) {
    await replyWithoutMentions(
      interaction,
      `요청이 너무 빠릅니다. 약 ${limit.retryAfterSeconds}초 뒤에 다시 시도해 주세요.`,
      true,
    );
    return;
  }

  await interaction.deferReply();
  const startedAt = Date.now();
  try {
    if (interaction.commandName === "problem") {
      const problemId = interaction.options.getInteger("problem-id", true);
      const problem = await dependencies.jungolService.getProblem(problemId);
      await interaction.editReply({
        embeds: [buildJungolProblemEmbed(problem)],
        allowedMentions: { parse: [] },
      });
    } else if (interaction.commandName === "tag") {
      const query = interaction.options.getString("query", true).trim();
      const problems = await dependencies.jungolService.searchProblemsByTag(query);
      await interaction.editReply({
        embeds: [buildJungolTagEmbed(query, problems)],
        allowedMentions: { parse: [] },
      });
    } else {
      const handle = interaction.options.getString("handle", true).trim();
      const accounts = await dependencies.jungolService.searchAccounts(handle);
      await interaction.editReply({
        embeds: [buildJungolUserEmbed(handle, accounts)],
        allowedMentions: { parse: [] },
      });
    }
    dependencies.logger.info("Jungol command completed", {
      commandName: interaction.commandName,
      userId: interaction.user.id,
      guildId: interaction.guildId,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    dependencies.logger.error("Jungol command failed", {
      commandName: interaction.commandName,
      userId: interaction.user.id,
      guildId: interaction.guildId,
      durationMs: Date.now() - startedAt,
      ...serializeError(error),
    });
    await interaction.editReply({
      content: getJungolFailureMessage(error),
      allowedMentions: { parse: [] },
    });
  }
}

export function createInteractionHandler(dependencies: InteractionDependencies) {
  return async (interaction: Interaction): Promise<void> => {
    if (!interaction.isChatInputCommand()) return;

    if (!interaction.guildId || !dependencies.allowedGuildIds.has(interaction.guildId)) {
      dependencies.logger.warn("Blocked interaction outside the allowed guild", {
        userId: interaction.user.id,
        guildId: interaction.guildId,
      });
      await replyWithoutMentions(
        interaction,
        "이 봇은 지정된 디스코드 서버에서만 사용할 수 있습니다.",
      );
      return;
    }

    if (interaction.commandName === "search") {
      await handleSearch(interaction, dependencies);
      return;
    }

    if (interaction.commandName === "lineup") {
      await handleLineup(interaction, dependencies);
      return;
    }

    if (["problem", "tag", "user"].includes(interaction.commandName)) {
      await handleJungol(interaction, dependencies);
      return;
    }

    if (interaction.commandName === "kboplayer") {
      const player = dependencies.pickKboPlayer();
      await replyWithoutMentions(
        interaction,
        `이번 비밀 정답 선수는 **${player}**입니다. 다른 참가자에게는 이 메시지가 보이지 않습니다.`,
        true,
      );
      dependencies.logger.info("KBO guessing player selected", {
        userId: interaction.user.id,
        guildId: interaction.guildId,
      });
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
