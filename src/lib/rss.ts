import Parser from "rss-parser";

const parser = new Parser();

export async function fetchRssItems(url: string, limit = 5) {
  const feed = await parser.parseURL(url);
  const items = (feed.items || [])
    .map((item) => ({
      title: item.title ?? "",
      link: item.link ?? "",
      pubDate: item.pubDate ?? item.isoDate ?? null
    }))
    .filter((item) => item.link)
    .slice(0, limit);

  return items;
}
