import { SlashCommandBuilder } from "discord.js";

export const commandBuilders = [
  new SlashCommandBuilder()
    .setName("search")
    .setDescription("웹을 검색해 자연스러운 말투로 답변합니다")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("검색하거나 물어볼 내용")
        .setRequired(true)
        .setMinLength(2)
        .setMaxLength(1_000),
    ),
  new SlashCommandBuilder()
    .setName("reset")
    .setDescription("현재 채널의 내 후속 대화 문맥을 초기화합니다"),
  new SlashCommandBuilder().setName("ping").setDescription("봇의 연결 상태를 확인합니다"),
] as const;

export const commandPayload = commandBuilders.map((command) => command.toJSON());
