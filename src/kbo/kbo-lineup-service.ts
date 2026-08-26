import { KboError } from "./kbo-error.js";
import { resolveKboTeam, supportedKboTeamNames } from "./teams.js";
import type {
  KboDataProvider,
  KboLineupAnswer,
  KboLineupServiceContract,
} from "./types.js";

export function formatKoreanDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export class KboLineupService implements KboLineupServiceContract {
  constructor(
    private readonly provider: KboDataProvider,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async getToday(teamQuery: string): Promise<KboLineupAnswer> {
    const team = resolveKboTeam(teamQuery);
    if (!team) {
      throw new KboError(
        "KBO_TEAM_NOT_FOUND",
        `팀 이름을 확인해 주세요. 사용 가능한 팀: ${supportedKboTeamNames}`,
      );
    }

    const date = formatKoreanDate(this.now());
    const schedule = await this.provider.getSchedule(date);
    const matchingGames = schedule.filter(
      (game) => game.homeTeam.code === team.code || game.awayTeam.code === team.code,
    );
    if (matchingGames.length === 0) {
      throw new KboError("KBO_NO_GAME", `${team.name}의 오늘 KBO 경기가 없습니다.`);
    }

    const games = await Promise.all(
      matchingGames.map((game) => this.provider.getLineup(game)),
    );
    return { date, requestedTeam: team, games };
  }
}
