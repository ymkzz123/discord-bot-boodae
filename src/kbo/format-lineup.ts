import type { KboGameLineup, KboLineupAnswer, KboTeamLineup } from "./types.js";

function formatDate(date: string): string {
  const [, month, day] = date.split("-");
  return `${Number(month)}월 ${Number(day)}일`;
}

function formatTime(dateTime: string): string {
  const match = /T(\d{2}:\d{2})/.exec(dateTime);
  return match?.[1] ?? "시간 미정";
}

function formatTeamLineup(teamName: string, lineup: KboTeamLineup): string {
  const pitcher = lineup.startingPitcher
    ? `선발투수: ${lineup.startingPitcher}`
    : "선발투수: 아직 발표되지 않음";
  if (lineup.batters.length === 0) return `${teamName}\n${pitcher}\n타순: 아직 발표되지 않음`;

  const batters = lineup.batters.map((player) => {
    const position = player.position ? ` (${player.position})` : "";
    return `${player.battingOrder}. ${player.name}${position}`;
  });
  return `${teamName}\n${pitcher}\n${batters.join("\n")}`;
}

function formatGame(lineup: KboGameLineup): string {
  const { game } = lineup;
  const status = game.cancelled
    ? "취소"
    : game.suspended
      ? "중단"
      : game.statusCode === "RESULT"
        ? "경기 종료"
        : game.statusCode === "BEFORE" || game.statusCode === "READY"
          ? "경기 전"
          : game.statusText;
  const stadium = game.stadium ? ` · ${game.stadium}` : "";
  const publicationNotice = lineup.published
    ? ""
    : "\n\n전체 타순은 아직 발표되지 않았습니다. 네이버 스포츠에 등록된 뒤 다시 확인해 주세요.";

  return [
    `${formatDate(game.gameDate)} ${game.awayTeam.name} vs ${game.homeTeam.name}`,
    `${formatTime(game.gameDateTime)}${stadium} · ${status}`,
    "",
    formatTeamLineup(game.awayTeam.fullName, lineup.away),
    "",
    formatTeamLineup(game.homeTeam.fullName, lineup.home),
  ].join("\n") + publicationNotice;
}

export function formatKboLineupAnswer(answer: KboLineupAnswer): string {
  return answer.games.map(formatGame).join("\n\n──────────\n\n");
}
