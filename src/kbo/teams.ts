import type { KboTeam } from "./types.js";

interface TeamDefinition extends KboTeam {
  aliases: readonly string[];
}

const teams: readonly TeamDefinition[] = [
  { code: "LG", name: "LG", fullName: "LG 트윈스", aliases: ["lg", "엘지", "lg트윈스", "엘지트윈스", "트윈스"] },
  { code: "KT", name: "KT", fullName: "KT 위즈", aliases: ["kt", "케이티", "kt위즈", "케이티위즈", "위즈"] },
  { code: "SK", name: "SSG", fullName: "SSG 랜더스", aliases: ["ssg", "에스에스지", "ssg랜더스", "에스에스지랜더스", "랜더스", "쓱"] },
  { code: "NC", name: "NC", fullName: "NC 다이노스", aliases: ["nc", "엔씨", "nc다이노스", "엔씨다이노스", "다이노스"] },
  { code: "HT", name: "KIA", fullName: "KIA 타이거즈", aliases: ["kia", "기아", "kia타이거즈", "기아타이거즈", "타이거즈"] },
  { code: "OB", name: "두산", fullName: "두산 베어스", aliases: ["두산", "두산베어스", "베어스"] },
  { code: "LT", name: "롯데", fullName: "롯데 자이언츠", aliases: ["롯데", "롯데자이언츠", "자이언츠"] },
  { code: "SS", name: "삼성", fullName: "삼성 라이온즈", aliases: ["삼성", "삼성라이온즈", "라이온즈"] },
  { code: "HH", name: "한화", fullName: "한화 이글스", aliases: ["한화", "한화이글스", "이글스"] },
  { code: "WO", name: "키움", fullName: "키움 히어로즈", aliases: ["키움", "키움히어로즈", "히어로즈"] },
] as const;

function normalize(value: string): string {
  return value.toLocaleLowerCase("ko-KR").replace(/[^\p{L}\p{N}]/gu, "");
}

export function resolveKboTeam(query: string): KboTeam | null {
  const normalized = normalize(query);
  const team = teams.find((candidate) =>
    [candidate.code, candidate.name, candidate.fullName, ...candidate.aliases]
      .map(normalize)
      .includes(normalized),
  );

  return team
    ? { code: team.code, name: team.name, fullName: team.fullName }
    : null;
}

export function resolveKboTeamCode(code: string, fallbackName: string): KboTeam {
  const team = teams.find((candidate) => candidate.code === code);
  return team
    ? { code: team.code, name: team.name, fullName: team.fullName }
    : { code, name: fallbackName, fullName: fallbackName };
}

export const supportedKboTeamNames = teams.map((team) => team.name).join(", ");
