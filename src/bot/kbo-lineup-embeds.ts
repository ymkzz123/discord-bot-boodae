import { EmbedBuilder } from "discord.js";

import type { KboGameLineup, KboLineupAnswer, KboTeamLineup } from "../kbo/types.js";

const KBO_BLUE = 0x1d428a;

function formatDate(date: string): string {
  const [, month, day] = date.split("-");
  return `${Number(month)}월 ${Number(day)}일`;
}

function formatTime(dateTime: string): string {
  const match = /T(\d{2}:\d{2})/.exec(dateTime);
  return match?.[1] ?? "시간 미정";
}

function formatStatus(lineup: KboGameLineup): string {
  const { game } = lineup;
  if (game.cancelled) return "취소";
  if (game.suspended) return "중단";
  if (game.statusCode === "RESULT") return "경기 종료";
  if (game.statusCode === "BEFORE" || game.statusCode === "READY") return "경기 전";
  return game.statusText;
}

function formatTeamLineup(lineup: KboTeamLineup): string {
  const pitcher = lineup.startingPitcher ?? "아직 발표되지 않음";
  const batters = lineup.batters.length > 0
    ? lineup.batters.map((player) => {
        const position = player.position ? ` · ${player.position}` : "";
        return `**${player.battingOrder}.** ${player.name}${position}`;
      }).join("\n")
    : "타순은 아직 발표되지 않았습니다.";

  return `**선발투수**  ${pitcher}\n\n${batters}`;
}

function buildGameEmbed(
  lineup: KboGameLineup,
  gameIndex: number,
  gameCount: number,
): EmbedBuilder {
  const { game } = lineup;
  const doubleheader = gameCount > 1 ? ` · ${gameIndex + 1}차전` : "";
  const stadium = game.stadium ?? "구장 미정";

  return new EmbedBuilder()
    .setColor(KBO_BLUE)
    .setAuthor({ name: "KBO 오늘의 라인업" })
    .setTitle(`${game.awayTeam.name} vs ${game.homeTeam.name}${doubleheader}`)
    .setDescription([
      `🗓️ **${formatDate(game.gameDate)}**  ·  ⏰ **${formatTime(game.gameDateTime)}**`,
      `📍 ${stadium}  ·  **${formatStatus(lineup)}**`,
    ].join("\n"))
    .addFields(
      {
        name: `원정  |  ${game.awayTeam.fullName}`,
        value: formatTeamLineup(lineup.away),
        inline: false,
      },
      {
        name: `홈  |  ${game.homeTeam.fullName}`,
        value: formatTeamLineup(lineup.home),
        inline: false,
      },
    )
    .setFooter({
      text: lineup.published
        ? "발표된 선발 라인업 기준"
        : "전체 타순 발표 전 · 발표 후 다시 조회해 주세요",
    });
}

export function buildKboLineupEmbeds(answer: KboLineupAnswer): EmbedBuilder[] {
  return answer.games.map((lineup, index) =>
    buildGameEmbed(lineup, index, answer.games.length));
}
