import { resolve } from "node:path";

import { Events } from "discord.js";

import { loadRuntimeConfig } from "./config/env.js";
import { createBot } from "./bot/create-bot.js";
import { DiscordKboAlertNotifier } from "./bot/discord-kbo-alert-notifier.js";
import { GeminiAnswerGenerator } from "./gemini/gemini-answer-generator.js";
import { createLogger } from "./lib/logger.js";
import { JsonHttpClient } from "./scraping/json-http-client.js";
import { BrowserHttpClient } from "./scraping/browser-http-client.js";
import { KboLineupService } from "./kbo/kbo-lineup-service.js";
import { KboAlertMonitor } from "./kbo/kbo-alert-monitor.js";
import { pickRandomKboPlayer } from "./kbo/guess-players.js";
import { NaverKboProvider } from "./kbo/naver-kbo-provider.js";
import { JungolHtmlProvider } from "./jungol/jungol-html-provider.js";
import { CompositeSearchProvider } from "./search/composite-search-provider.js";
import { BingHtmlEngine } from "./search/engines/bing-engine.js";
import { DuckDuckGoHtmlEngine } from "./search/engines/duckduckgo-engine.js";
import { NaverHtmlEngine } from "./search/engines/naver-engine.js";
import { WebSearchService } from "./search/web-search-service.js";
import { FixedWindowRateLimiter } from "./security/rate-limiter.js";
import { ConversationStore } from "./state/conversation-store.js";
import { FileKboAlertStateStore } from "./state/kbo-alert-state-store.js";

const config = loadRuntimeConfig();
const logger = createLogger(config.logLevel);

const conversations = new ConversationStore(config.conversationTtlMs);
const rateLimiter = new FixedWindowRateLimiter(
  config.rateLimitRequests,
  config.rateLimitWindowMs,
);
const browserHttp = new BrowserHttpClient();
const jsonHttp = new JsonHttpClient();
const searchProvider = new CompositeSearchProvider(
  [
    new DuckDuckGoHtmlEngine(browserHttp),
    new NaverHtmlEngine(browserHttp),
    new BingHtmlEngine(browserHttp),
  ],
  config.searchTimeoutMs,
);
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
const kboProvider = new NaverKboProvider(
  jsonHttp,
  config.kboTimeoutMs,
  config.kboCacheTtlMs,
);
const kboLineupService = new KboLineupService(kboProvider);
const jungolService = new JungolHtmlProvider(
  browserHttp,
  config.jungolTimeoutMs,
  config.jungolCacheTtlMs,
);
const allowedGuildIds = new Set(config.discordAllowedGuildIds);

const bot = createBot(
  {
    searchService,
    kboLineupService,
    jungolService,
    pickKboPlayer: pickRandomKboPlayer,
    conversations,
    rateLimiter,
    logger,
    maxResponseChars: config.maxResponseChars,
    allowedGuildIds,
  },
  logger,
);

const kboAlertMonitor = config.kboAlertChannelIds.length > 0
  ? new KboAlertMonitor(
      kboProvider,
      new DiscordKboAlertNotifier(
        bot,
        config.kboAlertChannelIds,
        allowedGuildIds,
        config.kboAlertRoleName,
        logger,
      ),
      new FileKboAlertStateStore(resolve(".data/kbo-alert-state.json")),
      logger,
      config.kboAlertActivePollMs,
      config.kboAlertIdlePollMs,
      config.kboPlayballGraceMs,
    )
  : undefined;

bot.once(Events.ClientReady, () => kboAlertMonitor?.start());

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
  kboAlertMonitor?.stop();
  bot.destroy();
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

await bot.login(config.discordToken);
