export type JungolErrorCode =
  | "JUNGOL_INVALID_INPUT"
  | "JUNGOL_NOT_FOUND"
  | "JUNGOL_NO_RESULTS"
  | "JUNGOL_UPSTREAM_FAILED"
  | "JUNGOL_INVALID_RESPONSE";

export class JungolError extends Error {
  constructor(
    public readonly code: JungolErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "JungolError";
  }
}

export function getJungolFailureMessage(error: unknown): string {
  if (!(error instanceof JungolError)) {
    return "정올 정보를 가져오는 중 알 수 없는 오류가 발생했습니다. 잠시 뒤 다시 시도해 주세요.";
  }

  switch (error.code) {
    case "JUNGOL_INVALID_INPUT":
    case "JUNGOL_NOT_FOUND":
    case "JUNGOL_NO_RESULTS":
      return error.message;
    case "JUNGOL_UPSTREAM_FAILED":
      return "현재 정올 사이트에 연결할 수 없습니다. 잠시 뒤 다시 시도해 주세요. (JUNGOL_UPSTREAM_FAILED)";
    case "JUNGOL_INVALID_RESPONSE":
      return "정올 사이트 구조가 변경되어 결과를 읽지 못했습니다. 관리자에게 알려 주세요. (JUNGOL_INVALID_RESPONSE)";
  }
}
