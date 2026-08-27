declare module "jsdom" {
  export interface JsdomElement {
    readonly className: string;
    readonly parentElement: JsdomElement | null;
    readonly textContent: string | null;
    closest(selectors: string): JsdomElement | null;
    getAttribute(name: string): string | null;
    querySelector(selectors: string): JsdomElement | null;
    querySelectorAll(selectors: string): Iterable<JsdomElement>;
  }

  export interface JsdomDocument {
    readonly body: JsdomElement;
    querySelector(selectors: string): JsdomElement | null;
    querySelectorAll(selectors: string): Iterable<JsdomElement>;
  }

  export class JSDOM {
    constructor(html?: string);
    readonly window: {
      readonly document: JsdomDocument;
      close(): void;
    };
  }
}
