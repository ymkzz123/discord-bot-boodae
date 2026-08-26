import { SearchError } from "./search-error.js";
import type {
  AnswerGenerator,
  SearchAnswer,
  SearchOptions,
  SearchProvider,
  SearchService,
} from "./types.js";

export class WebSearchService implements SearchService {
  constructor(
    private readonly provider: SearchProvider,
    private readonly answerGenerator: AnswerGenerator,
    private readonly maxResults: number,
  ) {}

  async search(query: string, options: SearchOptions = {}): Promise<SearchAnswer> {
    const results = await this.provider.search(query, { limit: this.maxResults });
    if (results.length === 0) {
      throw new SearchError("SEARCH_NO_RESULTS", `${this.provider.id} returned no results`);
    }

    const answer = await this.answerGenerator.generate(query, results, options.previousTurn);

    return {
      markdown: answer,
      sourceCount: results.length,
    };
  }
}
