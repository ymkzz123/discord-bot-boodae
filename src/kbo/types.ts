export interface KboTeam {
  code: string;
  name: string;
  fullName: string;
}

export interface KboScheduledGame {
  gameId: string;
  gameDate: string;
  gameDateTime: string;
  stadium: string | null;
  statusCode: string;
  statusText: string;
  cancelled: boolean;
  suspended: boolean;
  homeTeam: KboTeam;
  awayTeam: KboTeam;
}

export interface KboLineupPlayer {
  battingOrder: number;
  name: string;
  position: string | null;
}

export interface KboTeamLineup {
  startingPitcher: string | null;
  batters: KboLineupPlayer[];
}

export interface KboGameLineup {
  game: KboScheduledGame;
  home: KboTeamLineup;
  away: KboTeamLineup;
  published: boolean;
}

export interface KboDataProvider {
  getSchedule(date: string): Promise<KboScheduledGame[]>;
  getLineup(game: KboScheduledGame): Promise<KboGameLineup>;
}

export interface KboLineupAnswer {
  date: string;
  requestedTeam: KboTeam;
  games: KboGameLineup[];
}

export interface KboLineupServiceContract {
  getToday(teamQuery: string): Promise<KboLineupAnswer>;
}
