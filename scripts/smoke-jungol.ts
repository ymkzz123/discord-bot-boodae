import { JungolHtmlProvider } from "../src/jungol/jungol-html-provider.js";
import { BrowserHttpClient } from "../src/scraping/browser-http-client.js";

const [mode = "problem", query = "1000"] = process.argv.slice(2);
const provider = new JungolHtmlProvider(new BrowserHttpClient(), 10_000, 30_000);

if (mode === "problem") {
  console.log(await provider.getProblem(Number(query)));
} else if (mode === "tag") {
  console.log(await provider.searchProblemsByTag(query));
} else if (mode === "user") {
  console.log(await provider.searchAccounts(query));
} else {
  throw new Error("Usage: npm run jungol:smoke -- <problem|tag|user> <query>");
}
