export interface UrlCitation {
  startIndex: number;
  endIndex: number;
  url: string;
  title: string;
}

export interface CitationSource {
  url: string;
  title: string;
}

function safeMarkdownLabel(value: string): string {
  return value.replaceAll("[", "\\[").replaceAll("]", "\\]").trim();
}

export function renderCitations(
  text: string,
  annotations: readonly UrlCitation[],
): { markdown: string; sources: CitationSource[] } {
  const uniqueAnnotations = new Map<string, UrlCitation>();

  for (const annotation of annotations) {
    if (
      annotation.startIndex < 0 ||
      annotation.endIndex <= annotation.startIndex ||
      annotation.endIndex > text.length ||
      !URL.canParse(annotation.url)
    ) {
      continue;
    }

    const key = `${annotation.startIndex}:${annotation.endIndex}:${annotation.url}`;
    uniqueAnnotations.set(key, annotation);
  }

  const sorted = [...uniqueAnnotations.values()].sort(
    (left, right) => right.endIndex - left.endIndex || right.startIndex - left.startIndex,
  );

  let markdown = text;
  let nextAvailableIndex = text.length;
  for (const annotation of sorted) {
    if (annotation.endIndex > nextAvailableIndex) continue;

    const visibleText = safeMarkdownLabel(text.slice(annotation.startIndex, annotation.endIndex));
    const label = visibleText || safeMarkdownLabel(annotation.title) || "출처";
    const replacement = `[${label}](${annotation.url})`;
    markdown =
      markdown.slice(0, annotation.startIndex) +
      replacement +
      markdown.slice(annotation.endIndex);
    nextAvailableIndex = annotation.startIndex;
  }

  const sourcesByUrl = new Map<string, CitationSource>();
  for (const annotation of sorted) {
    sourcesByUrl.set(annotation.url, {
      url: annotation.url,
      title: annotation.title.trim() || new URL(annotation.url).hostname,
    });
  }

  return { markdown, sources: [...sourcesByUrl.values()] };
}

export function appendSourceList(
  markdown: string,
  sources: readonly CitationSource[],
  maxSources = 8,
): string {
  if (sources.length === 0) return markdown;

  const items = sources.slice(0, maxSources).map((source, index) => {
    const title = safeMarkdownLabel(source.title);
    return `${index + 1}. [${title}](${source.url})`;
  });

  const omitted = sources.length - items.length;
  if (omitted > 0) items.push(`외 ${omitted}개 출처`);

  return `${markdown.trim()}\n\n**출처**\n${items.join("\n")}`;
}
