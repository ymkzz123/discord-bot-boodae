import type { SearchResult } from "./types.js";

function safeMarkdownLabel(value: string): string {
  return value.replaceAll("[", "\\[").replaceAll("]", "\\]").trim();
}

export function appendSourceList(
  markdown: string,
  sources: readonly SearchResult[],
  maxSources = 8,
): string {
  if (sources.length === 0) return markdown;

  const items = sources.slice(0, maxSources).map((source, index) => {
    const title = safeMarkdownLabel(source.title) || new URL(source.url).hostname;
    return `${index + 1}. [${title}](${source.url})`;
  });

  const omitted = sources.length - items.length;
  if (omitted > 0) items.push(`외 ${omitted}개 출처`);

  return `${markdown.trim()}\n\n**출처**\n${items.join("\n")}`;
}
