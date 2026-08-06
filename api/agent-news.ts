
import { getPlatformToken, firestoreAdd, firestorePatch, firestoreQuery } from "./_agent-utils";

const GNEWS_API_KEY = process.env.GNEWS_API_KEY || "";

function detectTag(title: string, desc: string): string {
  const text = `${title} ${desc}`.toLowerCase();
  const rules: [string[], string][] = [
    [["premier league","epl","man united","man city","arsenal","chelsea","liverpool","tottenham"], "Premier League"],
    [["champions league","ucl","europa league"], "Champions League"],
    [["world cup","fifa world"], "World Cup"],
    [["afcon","africa cup","caf","bafana","south africa","psl","premier soccer league","cosafa","safa"], "PSL & Africa"],
    [["transfer","signing","sign","sold","loan","fee","deal","bid"], "Transfer"],
    [["la liga","real madrid","barcelona","atletico"], "La Liga"],
    [["serie a","juventus","inter milan","ac milan","napoli"], "Serie A"],
    [["bundesliga","bayern","dortmund"], "Bundesliga"],
    [["ligue 1","psg","paris saint"], "Ligue 1"],
    [["mls","major league soccer"], "MLS"],
    [["injury","injured","ruled out"], "Injury"],
    [["manager","sacked","appointed","coach","resigned"], "Management"],
  ];
  for (const [kws, cat] of rules) if (kws.some(kw => text.includes(kw))) return cat;
  return "Football";
}

export default async function handler(_req: any, res: any) {
  if (!GNEWS_API_KEY) {
    return res.status(500).json({ error: "GNEWS_API_KEY not configured" });
  }
  try {
    const apiRes = await fetch(
      `https://gnews.io/api/v4/search?q=football+OR+soccer&lang=en&sortby=publishedAt&max=30&apikey=${GNEWS_API_KEY}`
    );
    const data = await apiRes.json();
    if (!Array.isArray(data.articles)) {
      return res.status(500).json({ error: "GNews error", detail: data });
    }

    const token = await getPlatformToken();
    const now = new Date();
    const twoHoursAgo = new Date(Date.now() - 2 * 3600000);
    const existing = await firestoreQuery("news", token);
    const existingUrls = new Set(existing.map((n: any) => n.sourceUrl));

    let added = 0;
    for (const article of data.articles) {
      if (!article.title || existingUrls.has(article.url)) continue;
      const publishedAt = new Date(article.publishedAt || now);
      const tag = detectTag(article.title, article.description || "");
      const newsId = `news_live_${Date.now()}_${added}`;
      await firestoreAdd("news", {
        newsId, tag, category: tag,
        headline: article.title.replace(/ - [^-]+$/, "").trim(),
        subtitle: article.description || "",
        timestamp: publishedAt.toISOString(),
        hot: publishedAt > twoHoursAgo,
        sourceUrl: article.url || "",
        sourceImage: article.image || "",
        sourceName: article.source?.name || "Football News",
        createdAt: now.toISOString(),
      }, token);
      added++;
    }

    const allNews = await firestoreQuery("news", token);
    if (allNews.length > 60) {
      const sorted = allNews.sort((a: any, b: any) => (b.timestamp || "").localeCompare(a.timestamp || ""));
      for (const old of sorted.slice(60)) {
        await firestorePatch("news", old._id || old.newsId, { isArchived: true }, token);
      }
    }

    return res.status(200).json({ message: `Added ${added} new articles` });
  } catch (err: any) {
    console.error("[agent-news]", err);
    return res.status(500).json({ error: err.message });
  }
}
