import { describe, expect, it, vi } from "vitest";

import { JungolHtmlProvider } from "../src/jungol/jungol-html-provider.js";
import { BROWSER_HEADERS, BrowserHttpClient } from "../src/scraping/browser-http-client.js";

const problemHtml = `<!doctype html><html><head>
  <link rel="canonical" href="https://jungol.co.kr/problem/1000">
  <meta property="og:title" content="두 정수 더하기 (A+B) · Bronze V">
  <meta property="og:description" content="Bronze V · 4,885 solved users · 13,627 submissions">
</head><body>
  <h1>두 정수 더하기 (A+B) timer 1s memory 4MB</h1>
  <a href="/problem?tag=math">수학</a>
</body></html>`;

const tagHtml = `<!doctype html><html><body>
  <a href="/problem/1500">#1500 최소 스패닝 트리</a>
  <a href="/problem/1501">#1501 도시 연결하기</a>
  <a href="/problem/1500">중복 링크</a>
</body></html>`;

const serializedTagHtml = `<!doctype html><html><body><script>
  data: {type:"data",data:{"$/problem?page=1&tags=mst":{data:{list:[
    {title:"최소 스패닝 트리",title_en:"MST",id:1500,rank:{solvedUsr:10}},
    {title:"도시 \\uC5F0\\uACB0하기",id:1501,tag:[]}
  ],paging:{type:"page",total:2}}}}}
</script></body></html>`;

const userHtml = `<!doctype html><html><body><script>
  data: {type:"data",data:{"$/submission?account=goodaiden":{data:{list:[
    {id:100,accountInfo:{id:42,handle:"goodaiden",name:"Good Aiden",nickname:"Good Aiden",permission:{submit:true}}},
    {id:101,accountInfo:{id:42,handle:"goodaiden",name:"Good Aiden",nickname:"Good Aiden",permission:{submit:true}}}
  ],paging:{type:"cursor"}}}}}
</script></body></html>`;

describe("JungolHtmlProvider", () => {
  it("reads only summary metadata from a public problem page", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(problemHtml, { status: 200 }));
    const provider = new JungolHtmlProvider(new BrowserHttpClient(fetcher), 10_000, 300_000);

    await expect(provider.getProblem(1000)).resolves.toEqual({
      id: 1000,
      title: "두 정수 더하기 (A+B)",
      tier: "Bronze V",
      solvedUsers: 4885,
      submissions: 13627,
      timeLimit: "1s",
      memoryLimit: "4MB",
      tags: ["수학"],
      url: "https://jungol.co.kr/problem/1000",
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("deduplicates tag results and uses the public tag page", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(tagHtml, { status: 200 }));
    const provider = new JungolHtmlProvider(new BrowserHttpClient(fetcher), 10_000, 300_000);

    const results = await provider.searchProblemsByTag("mst");
    expect(results).toEqual([
      { id: 1500, title: "최소 스패닝 트리", url: "https://jungol.co.kr/problem/1500" },
      { id: 1501, title: "도시 연결하기", url: "https://jungol.co.kr/problem/1501" },
    ]);
    const requested = new URL(String(fetcher.mock.calls[0]?.[0]));
    expect(requested.pathname).toBe("/problem");
    expect(requested.searchParams.get("tag")).toBe("mst");
  });

  it("reads tag results from Jungol's server-rendered serialized list", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(serializedTagHtml, { status: 200 }));
    const provider = new JungolHtmlProvider(new BrowserHttpClient(fetcher), 10_000, 300_000);

    await expect(provider.searchProblemsByTag("mst")).resolves.toEqual([
      { id: 1500, title: "최소 스패닝 트리", url: "https://jungol.co.kr/problem/1500" },
      { id: 1501, title: "도시 연결하기", url: "https://jungol.co.kr/problem/1501" },
    ]);
  });

  it("searches public account results by handle and puts an exact match first", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(userHtml, { status: 200 }));
    const provider = new JungolHtmlProvider(new BrowserHttpClient(fetcher), 10_000, 300_000);

    const accounts = await provider.searchAccounts("@goodaiden");
    expect(accounts[0]).toEqual({
      id: 42,
      handle: "goodaiden",
      displayName: "Good Aiden",
      url: "https://jungol.co.kr/account/42",
    });
    const requested = new URL(String(fetcher.mock.calls[0]?.[0]));
    expect(requested.pathname).toBe("/submission");
    expect(requested.searchParams.get("account")).toBe("goodaiden");
  });

  it("retries a transient 403 with the shared browser-compatible public-page headers", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response("Forbidden", { status: 403 }))
      .mockResolvedValueOnce(new Response(problemHtml, { status: 200 }));
    const provider = new JungolHtmlProvider(new BrowserHttpClient(fetcher), 10_000, 300_000);

    await expect(provider.getProblem(1000)).resolves.toMatchObject({ id: 1000 });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
      headers: expect.objectContaining({ "user-agent": BROWSER_HEADERS["user-agent"] }),
    });
  });

  it("rejects an error page instead of treating it as an empty result", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response("<html><body>Invalid server response</body></html>", { status: 200 }),
    );
    const provider = new JungolHtmlProvider(new BrowserHttpClient(fetcher), 10_000, 300_000);

    await expect(provider.searchProblemsByTag("mst")).rejects.toMatchObject({
      code: "JUNGOL_UPSTREAM_FAILED",
    });
  });
});
