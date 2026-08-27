export interface JungolProblem {
  id: number;
  title: string;
  tier: string | null;
  solvedUsers: number | null;
  submissions: number | null;
  timeLimit: string | null;
  memoryLimit: string | null;
  tags: string[];
  url: string;
}

export interface JungolProblemSummary {
  id: number;
  title: string;
  url: string;
}

export interface JungolAccountSummary {
  id: number;
  handle: string;
  displayName: string | null;
  url: string;
}

export interface JungolProvider {
  getProblem(problemId: number): Promise<JungolProblem>;
  searchProblemsByTag(query: string): Promise<JungolProblemSummary[]>;
  searchAccounts(handle: string): Promise<JungolAccountSummary[]>;
}

export interface JungolServiceContract extends JungolProvider {}
