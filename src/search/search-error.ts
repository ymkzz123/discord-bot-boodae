export type SearchFailureCode =
  | "SEARCH_AUTH"
  | "SEARCH_PERMISSION"
  | "SEARCH_QUOTA"
  | "SEARCH_RATE_LIMIT"
  | "SEARCH_MODEL"
  | "SEARCH_TIMEOUT"
  | "SEARCH_PROVIDER"
  | "SEARCH_NO_RESULTS"
  | "SEARCH_FAILED";

export class SearchError extends Error {
  constructor(
    public readonly code: SearchFailureCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "SearchError";
  }
}

interface ErrorDetails {
  status?: unknown;
  code?: unknown;
  name?: unknown;
  message?: unknown;
}

function details(error: unknown): ErrorDetails {
  return typeof error === "object" && error !== null ? (error as ErrorDetails) : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.toLowerCase() : "";
}

export function classifySearchError(error: unknown): SearchFailureCode {
  if (error instanceof SearchError) return error.code;

  const value = details(error);
  const code = text(value.code);
  const name = text(value.name);
  const message = text(value.message);

  if (value.status === 401) return "SEARCH_AUTH";
  if (
    value.status === 400 &&
    (code.includes("api_key") || message.includes("api key"))
  ) {
    return "SEARCH_AUTH";
  }
  if (value.status === 403) return "SEARCH_PERMISSION";

  if (value.status === 429) {
    return code.includes("quota") ||
      code.includes("resource_exhausted") ||
      message.includes("quota") ||
      message.includes("free tier")
      ? "SEARCH_QUOTA"
      : "SEARCH_RATE_LIMIT";
  }

  if (
    value.status === 404 ||
    code.includes("model") ||
    message.includes("model") && message.includes("not found")
  ) {
    return "SEARCH_MODEL";
  }

  if (
    name.includes("abort") ||
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
    "Gemini 인증 설정에 문제가 있습니다. 봇 운영자가 GEMINI_API_KEY를 확인해 주세요. (SEARCH_AUTH)",
  SEARCH_PERMISSION:
    "Gemini API를 사용할 권한이 없습니다. API 키의 프로젝트와 제한 설정을 확인해 주세요. (SEARCH_PERMISSION)",
  SEARCH_QUOTA:
    "Gemini 무료 사용 한도에 도달했습니다. 한도가 갱신된 뒤 다시 시도해 주세요. (SEARCH_QUOTA)",
  SEARCH_RATE_LIMIT:
    "검색 서비스 요청이 몰렸습니다. 잠시 뒤 다시 시도해 주세요. (SEARCH_RATE_LIMIT)",
  SEARCH_MODEL:
    "설정한 Gemini 모델을 사용할 수 없습니다. GEMINI_MODEL을 확인해 주세요. (SEARCH_MODEL)",
  SEARCH_TIMEOUT:
    "검색 응답 시간이 초과되었습니다. 잠시 뒤 다시 시도해 주세요. (SEARCH_TIMEOUT)",
  SEARCH_PROVIDER:
    "웹 검색 결과를 가져오지 못했습니다. 잠시 뒤 다시 시도해 주세요. (SEARCH_PROVIDER)",
  SEARCH_NO_RESULTS:
    "검색 결과를 찾지 못했습니다. 검색어를 조금 다르게 입력해 주세요. (SEARCH_NO_RESULTS)",
  SEARCH_FAILED:
    "검색 중 문제가 발생했습니다. 봇 실행 로그의 ‘Search failed’를 확인해 주세요. (SEARCH_FAILED)",
};

export function getSearchFailureMessage(error: unknown): string {
  return messages[classifySearchError(error)];
}
