
import { getPlatformToken, firestoreAdd, firestorePatch, firestoreQuery } from "./_agent-utils";

// Runs every 6 hours: 0 0,6,12,18 * * *
// Fetches global football news from NewsAPI and stores in Firestore

const GNEWS_API_KEY = process.env.GNEWS_API_KEY || "";

function detectTag(title: string, description: string): { tag: string; category: string; hot: boolean } {
  const text = `${title} ${description}`.toLowerCase();
  const ageMs = 0; // determined by caller

  const rules: [string[], string][] = [
    [["premier league", "epl", "man united", "man city", "arsenal", "chelsea", "liverpool", "tottenham"], "Premier League"],
    [["champions league", "ucl", "europa league", "conference league"], "Champions League"],
    [["world cup", "fifa world"], "World Cup"],
    [["afcon", "africa cup", "caf", "bafana", "south africa", "psl", "premier soccer league", "cosafa", "safa"], "PSL & Africa"],
    [["transfer", "signing", "sign", "sold", "loan", "fee", "deal", "bid"], "Transfer"],
    [["la liga", "real madrid", "barcelona", "atletico"], "La Liga"],
    [["serie a", "juventus", "inter milan", "ac milan", "napoli"], "Serie A"],
    [["bundesliga", "bayern", "dortmund", "rb leipzig"], "Bundesliga"],
    [["ligue 1", "psg", "paris saint"], "Ligue 1"],
    [["mls", "major league soccer"], "MLS"],
    [["injury", "injured", "ruled out", "return"], "Injury"],
    [["manager", "sacked", "appointed", "coach", "resigned"], "Management"],
  ];

  for (const [keywords, category] of rules) {
    if (keywords.some(kw => text.includes(kw))) {
      return { tag: category, category, hot: false };
    }
  }

  return { tag: "Football", category: "Football", hot: false };
}

export default async function handler(_req: any, res: any) {
  if (!GNEWS_API_KEY) {
    res.status(500).json({ error: "GNEWS_API_KEY not configured" });
    return;
  }

  try {
    // Fetch top football headlines globally via GNews
    const apiRes = await fetch(
      `https://gnews.io/api/v4/search?q=football+OR+soccer&lang=en&sortby=publishedAt&max=30&apikey=${GNEWS_API_KEY}`
    );
    const data = await apiRes.json();

    if (!Array.isArray(data.articles)) {
      res.status(500).json({ error: "GNews error", detail: data });
      return;
    }

    const token = await getPlatformToken();
    const now = new Date();
    const twoHoursAgo = new Date(Date.now() - 2 * 3600000);

    // Get existing news IDs to avoid duplicates
    const existing = await firestoreQuery("news", token);
    const existingUrls = new Set(existing.map((n: any) => n.sourceUrl));

    let added = 0;
    for (const article of data.articles) {
      if (!article.title) continue;
      if (existingUrls.has(article.url)) continue;

      const publishedAt = new Date(article.publishedAt || now);
      const { tag, category } = detectTag(article.title, article.description || "");
      const hot = publishedAt > twoHoursAgo;

      const newsId = `news_live_${Date.now()}_${added}`;
      await firestoreAdd("news", {
        newsId,
        tag,
        headline: article.title.replace(/ - [^-]+$/, "").trim(),
        subtitle: article.description || "",
        category,
        timestamp: publishedAt.toISOString(),
        hot,
        sourceUrl: article.url || "",
        sourceImage: article.image || "",
        sourceName: article.source?.name || "Football News",
        createdAt: now.toISOString(),
      }, token);

      added++;
    }

    // Clean up old news (keep only last 60 articles)
    const allNews = await firestoreQuery("news", token);
    if (allNews.length > 60) {
      const sorted = allNews.sort((a: any, b: any) => (b.timestamp || "").localeCompare(a.timestamp || ""));
      const toDelete = sorted.slice(60);
      for (const old of toDelete) {
        await firestorePatch("news", old._id || old.newsId, { isArchived: true }, token);
      }
    }

    res.status(200).json({ message: `Added ${added} new articles` });
  } catch (err: any) {
    console.error("[agent-news]", err);
    res.status(500).json({ error: err.message });
  }
}
