import { describe, expect, it } from "vitest";

import {
  classifySearchError,
  getSearchFailureMessage,
  SearchError,
} from "../src/search/search-error.js";

describe("search error handling", () => {
  it.each([
    [{ status: 401 }, "SEARCH_AUTH"],
    [{ status: 400, message: "API key not valid" }, "SEARCH_AUTH"],
    [{ status: 403 }, "SEARCH_PERMISSION"],
    [{ status: 429, code: "RESOURCE_EXHAUSTED", message: "quota exceeded" }, "SEARCH_QUOTA"],
    [{ status: 429, code: "rate_limit_exceeded" }, "SEARCH_RATE_LIMIT"],
    [{ status: 404, message: "model not found" }, "SEARCH_MODEL"],
    [{ name: "TimeoutError" }, "SEARCH_TIMEOUT"],
  ] as const)("classifies %#", (error, expected) => {
    expect(classifySearchError(error)).toBe(expected);
    expect(getSearchFailureMessage(error)).toContain(`(${expected})`);
  });

  it("preserves an explicit provider failure", () => {
    const error = new SearchError("SEARCH_PROVIDER", "provider unavailable");
    expect(classifySearchError(error)).toBe("SEARCH_PROVIDER");
  });
});
