export type KboErrorCode =
  | "KBO_TEAM_NOT_FOUND"
  | "KBO_NO_GAME"
  | "KBO_UPSTREAM_FAILED"
  | "KBO_INVALID_RESPONSE";

export class KboError extends Error {
  constructor(
    public readonly code: KboErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "KboError";
  }
}

export function getKboFailureMessage(error: unknown): string {
  if (!(error instanceof KboError)) {
    return "KBO 정보를 확인하는 중 예상하지 못한 오류가 발생했습니다. (KBO_UNKNOWN)";
  }

  switch (error.code) {
    case "KBO_TEAM_NOT_FOUND":
      return `${error.message} (KBO_TEAM_NOT_FOUND)`;
    case "KBO_NO_GAME":
      return `${error.message} (KBO_NO_GAME)`;
    case "KBO_INVALID_RESPONSE":
      return "네이버 스포츠의 응답 형식이 변경된 것 같습니다. 잠시 후 다시 시도해 주세요. (KBO_INVALID_RESPONSE)";
    case "KBO_UPSTREAM_FAILED":
      return "네이버 스포츠에서 KBO 정보를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요. (KBO_UPSTREAM_FAILED)";
  }
}
