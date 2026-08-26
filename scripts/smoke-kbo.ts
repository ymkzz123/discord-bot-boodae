import { formatKboLineupAnswer } from "../src/kbo/format-lineup.js";
import { KboLineupService } from "../src/kbo/kbo-lineup-service.js";
import { NaverKboProvider } from "../src/kbo/naver-kbo-provider.js";
import { JsonHttpClient } from "../src/scraping/json-http-client.js";

const query = process.argv.slice(2).join(" ").trim();
if (!query) {
  console.error("사용법: npm run kbo:smoke -- 한화");
  process.exitCode = 1;
} else {
  const service = new KboLineupService(
    new NaverKboProvider(new JsonHttpClient(), 10_000, 30_000),
  );
  const answer = await service.getToday(query);
  console.log(formatKboLineupAnswer(answer));
}
