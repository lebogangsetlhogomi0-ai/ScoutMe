
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || "";
const FIREBASE_PROJECT_ID = "scoutme-10";
const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
const PLATFORM_EMAIL = process.env.PLATFORM_AGENT_EMAIL || "";
const PLATFORM_PASSWORD = process.env.PLATFORM_AGENT_PASSWORD || "";
const GNEWS_API_KEY = process.env.GNEWS_API_KEY || "";
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

async function getToken(): Promise<string> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: PLATFORM_EMAIL, password: PLATFORM_PASSWORD, returnSecureToken: true }) }
  );
  const data = await res.json();
  if (!data.idToken) throw new Error(`Auth failed: ${JSON.stringify(data)}`);
  return data.idToken;
}

function toFields(obj: any): any {
  const f: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    if (typeof v === "string") f[k] = { stringValue: v };
    else if (typeof v === "boolean") f[k] = { booleanValue: v };
    else if (typeof v === "number") f[k] = Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    else if (Array.isArray(v)) f[k] = { arrayValue: { values: v.map((i: any) => typeof i === "string" ? { stringValue: i } : { integerValue: String(i) }) } };
  }
  return f;
}

function fromFields(fields: any): any {
  const obj: any = {};
  for (const [k, v] of Object.entries(fields) as any[]) {
    if (v.stringValue !== undefined) obj[k] = v.stringValue;
    else if (v.integerValue !== undefined) obj[k] = parseInt(v.integerValue);
    else if (v.doubleValue !== undefined) obj[k] = v.doubleValue;
    else if (v.booleanValue !== undefined) obj[k] = v.booleanValue;
    else if (v.arrayValue) obj[k] = (v.arrayValue.values || []).map((i: any) => i.stringValue ?? parseInt(i.integerValue ?? "0"));
  }
  return obj;
}

async function fsQuery(col: string, token: string): Promise<any[]> {
  const res = await fetch(`${FIRESTORE_BASE}:runQuery`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: col }] } }),
  });
  const rows = await res.json();
  if (!Array.isArray(rows)) return [];
  return rows.filter((r: any) => r.document).map((r: any) => ({ _id: r.document.name?.split("/").pop(), ...fromFields(r.document.fields || {}) }));
}

async function fsAdd(col: string, data: any, token: string): Promise<void> {
  await fetch(`${FIRESTORE_BASE}/${col}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: toFields(data) }),
  });
}

async function fsPatch(col: string, id: string, data: any, token: string): Promise<void> {
  const mask = Object.keys(data).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&");
  await fetch(`${FIRESTORE_BASE}/${col}/${id}?${mask}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: toFields(data) }),
  });
}

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

    const token = await getToken();
    const now = new Date();
    const twoHoursAgo = new Date(Date.now() - 2 * 3600000);
    const existing = await fsQuery("news", token);
    const existingUrls = new Set(existing.map((n: any) => n.sourceUrl));

    let added = 0;
    for (const article of data.articles) {
      if (!article.title || existingUrls.has(article.url)) continue;
      const publishedAt = new Date(article.publishedAt || now);
      const tag = detectTag(article.title, article.description || "");
      const newsId = `news_live_${Date.now()}_${added}`;
      await fsAdd("news", {
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

    const allNews = await fsQuery("news", token);
    if (allNews.length > 60) {
      const sorted = allNews.sort((a: any, b: any) => (b.timestamp || "").localeCompare(a.timestamp || ""));
      for (const old of sorted.slice(60)) {
        await fsPatch("news", old._id || old.newsId, { isArchived: true }, token);
      }
    }

    return res.status(200).json({ message: `Added ${added} new articles` });
  } catch (err: any) {
    console.error("[agent-news]", err);
    return res.status(500).json({ error: err.message });
  }
}
