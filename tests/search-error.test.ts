import { describe, expect, it } from "vitest";

import {
  classifySearchError,
  getSearchFailureMessage,
  isInvalidPreviousResponseError,
} from "../src/openai/search-error.js";

describe("search error handling", () => {
  it.each([
    [{ status: 401 }, "SEARCH_AUTH"],
    [{ status: 403 }, "SEARCH_PERMISSION"],
    [{ status: 429, code: "insufficient_quota" }, "SEARCH_QUOTA"],
    [{ status: 429, code: "rate_limit_exceeded" }, "SEARCH_RATE_LIMIT"],
    [{ status: 400, param: "model" }, "SEARCH_MODEL"],
    [{ name: "APIConnectionTimeoutError" }, "SEARCH_TIMEOUT"],
  ] as const)("classifies %#", (error, expected) => {
    expect(classifySearchError(error)).toBe(expected);
    expect(getSearchFailureMessage(error)).toContain(`(${expected})`);
  });

  it("recognizes an invalid stored response so the search can retry without it", () => {
    expect(
      isInvalidPreviousResponseError({ status: 400, param: "previous_response_id" }),
    ).toBe(true);
  });
});
