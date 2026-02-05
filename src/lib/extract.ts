import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

export function extractArticleText(html: string, url: string) {
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  const text = article?.textContent?.trim() ?? "";
  return {
    title: article?.title ?? "",
    text
  };
}
