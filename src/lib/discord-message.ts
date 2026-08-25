const DISCORD_MESSAGE_LIMIT = 2_000;

function findSplitPoint(text: string, maxLength: number): number {
  const candidate = text.slice(0, maxLength + 1);
  const boundaries = [
    candidate.lastIndexOf("\n\n"),
    candidate.lastIndexOf("\n"),
    candidate.lastIndexOf(". "),
    candidate.lastIndexOf(" "),
  ];

  return boundaries.find((value) => value >= Math.floor(maxLength * 0.55)) ?? maxLength;
}

export function splitDiscordMessage(
  value: string,
  maxLength = DISCORD_MESSAGE_LIMIT,
): string[] {
  const text = value.trim();
  if (!text) return ["응답 내용이 비어 있습니다."];
  if (text.length <= maxLength) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > maxLength) {
    const splitAt = findSplitPoint(remaining, maxLength);
    const chunk = remaining.slice(0, splitAt).trimEnd();
    chunks.push(chunk);
    remaining = remaining.slice(splitAt).trimStart();
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}

export function truncateWithNotice(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;

  const notice = "\n\n_응답이 설정된 최대 길이를 넘어 일부를 생략했습니다._";
  return `${value.slice(0, Math.max(0, maxLength - notice.length)).trimEnd()}${notice}`;
}
