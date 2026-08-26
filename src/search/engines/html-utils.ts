import { JSDOM, type JsdomDocument } from "jsdom";

export function normalizeSearchText(value: string | null | undefined): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function withDocument<T>(html: string, read: (document: JsdomDocument) => T): T {
  const dom = new JSDOM(html);
  try {
    return read(dom.window.document);
  } finally {
    dom.window.close();
  }
}

export function externalHttpUrl(value: string | null | undefined, base?: string): string | undefined {
  try {
    const url = new URL(normalizeSearchText(value), base);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}
