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
    .setName("lineup")
    .setDescription("오늘 KBO 경기와 양 팀의 라인업을 확인합니다")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("팀 이름 또는 별칭 (예: 한화, LG, 기아)")
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(30),
    ),
  new SlashCommandBuilder()
    .setName("problem")
    .setDescription("문제번호로 문제찾기")
    .addIntegerOption((option) =>
      option
        .setName("problem-id")
        .setDescription("찾을 정올 문제 번호")
        .setRequired(true)
        .setMinValue(1),
    ),
  new SlashCommandBuilder()
    .setName("tag")
    .setDescription("태그로 문제 검색하기")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("정올 문제 태그 (예: mst, 동적 계획법)")
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(60),
    ),
  new SlashCommandBuilder()
    .setName("user")
    .setDescription("유저 검색하기")
    .addStringOption((option) =>
      option
        .setName("handle")
        .setDescription("찾을 정올 유저 이름")
        .setRequired(true)
        .setMinLength(2)
        .setMaxLength(30),
    ),
  new SlashCommandBuilder()
    .setName("kboplayer")
    .setDescription("KBO 선수 맞히기용 비밀 정답을 뽑습니다"),
  new SlashCommandBuilder()
    .setName("reset")
    .setDescription("현재 채널의 내 후속 대화 문맥을 초기화합니다"),
  new SlashCommandBuilder().setName("ping").setDescription("봇의 연결 상태를 확인합니다"),
] as const;

export const commandPayload = commandBuilders.map((command) => command.toJSON());
