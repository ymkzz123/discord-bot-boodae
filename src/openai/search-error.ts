export type SearchFailureCode =
  | "SEARCH_AUTH"
  | "SEARCH_PERMISSION"
  | "SEARCH_QUOTA"
  | "SEARCH_RATE_LIMIT"
  | "SEARCH_MODEL"
  | "SEARCH_TIMEOUT"
  | "SEARCH_FAILED";

interface ErrorDetails {
  status?: unknown;
  code?: unknown;
  param?: unknown;
  name?: unknown;
  message?: unknown;
  error?: {
    code?: unknown;
    param?: unknown;
  };
}

function details(error: unknown): ErrorDetails {
  return typeof error === "object" && error !== null ? (error as ErrorDetails) : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.toLowerCase() : "";
}

export function isInvalidPreviousResponseError(error: unknown): boolean {
  const value = details(error);
  const param = text(value.param ?? value.error?.param);
  const message = text(value.message);

  return value.status === 400 && (
    param === "previous_response_id" || message.includes("previous_response")
  );
}

export function classifySearchError(error: unknown): SearchFailureCode {
  const value = details(error);
  const code = text(value.code ?? value.error?.code);
  const name = text(value.name);
  const message = text(value.message);

  if (value.status === 401) return "SEARCH_AUTH";
  if (value.status === 403) return "SEARCH_PERMISSION";

  if (value.status === 429) {
    return code.includes("quota") || message.includes("quota") || message.includes("billing")
      ? "SEARCH_QUOTA"
      : "SEARCH_RATE_LIMIT";
  }

  if (
    code.includes("model") ||
    text(value.param ?? value.error?.param) === "model" ||
    message.includes("model_not_found")
  ) {
    return "SEARCH_MODEL";
  }

  if (
    name.includes("timeout") ||
    code.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("timeout")
  ) {
    return "SEARCH_TIMEOUT";
  }

  return "SEARCH_FAILED";
}

const messages: Record<SearchFailureCode, string> = {
  SEARCH_AUTH:
    "검색 서비스 인증 설정에 문제가 있습니다. 봇 운영자가 OPENAI_API_KEY를 확인해 주세요. (SEARCH_AUTH)",
  SEARCH_PERMISSION:
    "검색 서비스에 필요한 권한이 없습니다. 봇 운영자가 API 프로젝트 권한을 확인해 주세요. (SEARCH_PERMISSION)",
  SEARCH_QUOTA:
    "검색 서비스 사용 한도가 부족합니다. 봇 운영자가 OpenAI API 결제·사용 한도를 확인해 주세요. (SEARCH_QUOTA)",
  SEARCH_RATE_LIMIT:
    "검색 서비스 요청이 몰렸습니다. 잠시 뒤 다시 시도해 주세요. (SEARCH_RATE_LIMIT)",
  SEARCH_MODEL:
    "현재 검색 모델을 사용할 수 없습니다. 봇 운영자가 OPENAI_MODEL을 확인해 주세요. (SEARCH_MODEL)",
  SEARCH_TIMEOUT:
    "검색 응답 시간이 초과되었습니다. 잠시 뒤 다시 시도해 주세요. (SEARCH_TIMEOUT)",
  SEARCH_FAILED:
    "검색 중 문제가 발생했습니다. 봇 실행 로그의 ‘Search failed’를 확인해 주세요. (SEARCH_FAILED)",
};

export function getSearchFailureMessage(error: unknown): string {
  return messages[classifySearchError(error)];
}
