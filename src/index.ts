import { loadRuntimeConfig } from "./config/env.js";
import { createBot } from "./bot/create-bot.js";
import { GeminiAnswerGenerator } from "./gemini/gemini-answer-generator.js";
import { createLogger } from "./lib/logger.js";
import { DuckDuckGoSearchProvider } from "./search/duckduckgo-search-provider.js";
import { WebSearchService } from "./search/web-search-service.js";
import { FixedWindowRateLimiter } from "./security/rate-limiter.js";
import { ConversationStore } from "./state/conversation-store.js";

const config = loadRuntimeConfig();
const logger = createLogger(config.logLevel);

const conversations = new ConversationStore(config.conversationTtlMs);
const rateLimiter = new FixedWindowRateLimiter(
  config.rateLimitRequests,
  config.rateLimitWindowMs,
);
const searchProvider = new DuckDuckGoSearchProvider(config.searchTimeoutMs);
const answerGenerator = new GeminiAnswerGenerator(
  config.geminiApiKey,
  config.geminiModel,
  config.searchTimeoutMs,
);
const searchService = new WebSearchService(
  searchProvider,
  answerGenerator,
  config.searchMaxResults,
);

const bot = createBot(
  {
    searchService,
    conversations,
    rateLimiter,
    logger,
    maxResponseChars: config.maxResponseChars,
  },
  logger,
);

const sweepTimer = setInterval(() => {
  const expiredConversations = conversations.sweep();
  const expiredRateLimits = rateLimiter.sweep();
  if (expiredConversations > 0 || expiredRateLimits > 0) {
    logger.debug("Expired in-memory state removed", {
      expiredConversations,
      expiredRateLimits,
    });
  }
}, Math.min(config.conversationTtlMs, 60_000));
sweepTimer.unref();

async function shutdown(signal: string): Promise<void> {
  logger.info("Shutting down", { signal });
  clearInterval(sweepTimer);
  bot.destroy();
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

await bot.login(config.discordToken);
