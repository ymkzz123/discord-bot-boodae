import { EmbedBuilder } from "discord.js";

import type {
  JungolAccountSummary,
  JungolProblem,
  JungolProblemSummary,
} from "../jungol/types.js";

const JUNGOL_COLOR = 0x52537f;

function formatCount(value: number | null): string {
  return value === null ? "정보 없음" : value.toLocaleString("ko-KR");
}

export function buildJungolProblemEmbed(problem: JungolProblem): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(JUNGOL_COLOR)
    .setTitle(`#${problem.id} · ${problem.title}`)
    .setURL(problem.url)
    .addFields(
      { name: "난이도", value: problem.tier ?? "미정", inline: true },
      { name: "해결한 유저", value: formatCount(problem.solvedUsers), inline: true },
      { name: "제출", value: formatCount(problem.submissions), inline: true },
      {
        name: "제한",
        value: [problem.timeLimit, problem.memoryLimit].filter(Boolean).join(" · ") || "정보 없음",
        inline: false,
      },
    )
    .setFooter({ text: "JUNGOL 공개 문제 정보" });

  if (problem.tags.length > 0) {
    embed.addFields({ name: "태그", value: problem.tags.join(" · "), inline: false });
  }
  return embed;
}

export function buildJungolTagEmbed(
  query: string,
  problems: JungolProblemSummary[],
): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(JUNGOL_COLOR)
    .setTitle(`정올 태그 검색 · ${query}`)
    .setDescription(
      problems.map((problem) => `**#${problem.id}** · [${problem.title}](${problem.url})`).join("\n"),
    )
    .setFooter({ text: `상위 ${problems.length}개 결과 · JUNGOL` });
}

export function buildJungolUserEmbed(
  handle: string,
  accounts: JungolAccountSummary[],
): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(JUNGOL_COLOR)
    .setTitle(`정올 유저 검색 · ${handle}`)
    .setDescription(
      accounts
        .map((account) => {
          const name = account.displayName ? `${account.displayName} · ` : "";
          return `${name}[\`@${account.handle}\`](${account.url})`;
        })
        .join("\n"),
    )
    .setFooter({ text: `상위 ${accounts.length}개 결과 · JUNGOL` });
}
