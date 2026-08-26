export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  providerId?: string;
}

export interface SearchRequestOptions {
  limit: number;
}

/**
 * A source-specific result collector. Jungol support can implement this
 * interface without changing the Discord interaction layer.
 */
export interface SearchProvider {
  readonly id: string;
  search(query: string, options: SearchRequestOptions): Promise<SearchResult[]>;
}

export interface ConversationTurn {
  query: string;
  answer: string;
}

export interface AnswerGenerator {
  generate(
    query: string,
    results: readonly SearchResult[],
    previousTurn?: ConversationTurn,
  ): Promise<string>;
}

export interface SearchAnswer {
  markdown: string;
  sourceCount: number;
}

export interface SearchOptions {
  previousTurn?: ConversationTurn;
}

export interface SearchService {
  search(query: string, options?: SearchOptions): Promise<SearchAnswer>;
}
