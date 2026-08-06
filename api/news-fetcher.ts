
// --- inlined from _agent-utils (Vercel does not bundle local relative imports) ---
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || "";
const FIREBASE_PROJECT_ID = "scoutme-10";
const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
const PLATFORM_EMAIL = process.env.PLATFORM_AGENT_EMAIL || "";
const PLATFORM_PASSWORD = process.env.PLATFORM_AGENT_PASSWORD || "";
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

async function getPlatformToken(): Promise<string> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: PLATFORM_EMAIL, password: PLATFORM_PASSWORD, returnSecureToken: true }),
    }
  );
  const data = await res.json();
  if (!data.idToken) throw new Error(`Auth failed: ${JSON.stringify(data)}`);
  return data.idToken;
}

function objToFields(obj: any): any {
  const fields: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    if (typeof v === "string") fields[k] = { stringValue: v };
    else if (typeof v === "boolean") fields[k] = { booleanValue: v };
    else if (typeof v === "number") {
      fields[k] = Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    } else if (Array.isArray(v)) {
      fields[k] = {
        arrayValue: {
          values: (v as any[]).map(item =>
            typeof item === "string" ? { stringValue: item } : { integerValue: String(item) }
          ),
        },
      };
    } else if (typeof v === "object") {
      fields[k] = { mapValue: { fields: objToFields(v) } };
    }
  }
  return fields;
}

function fieldsToObj(fields: any): any {
  const obj: any = {};
  for (const [k, v] of Object.entries(fields) as any[]) {
    if (v.stringValue !== undefined) obj[k] = v.stringValue;
    else if (v.integerValue !== undefined) obj[k] = parseInt(v.integerValue);
    else if (v.doubleValue !== undefined) obj[k] = v.doubleValue;
    else if (v.booleanValue !== undefined) obj[k] = v.booleanValue;
    else if (v.arrayValue) obj[k] = (v.arrayValue.values || []).map((i: any) => i.stringValue ?? parseInt(i.integerValue ?? "0"));
    else if (v.mapValue) obj[k] = fieldsToObj(v.mapValue.fields || {});
  }
  return obj;
}

async function firestoreQuery(collectionId: string, token: string, filters?: { field: string; value: string | number | boolean }[]): Promise<any[]> {
  const whereClause = filters && filters.length > 0
    ? filters.length === 1
      ? {
          fieldFilter: {
            field: { fieldPath: filters[0].field },
            op: "EQUAL",
            value: typeof filters[0].value === "string"
              ? { stringValue: filters[0].value }
              : typeof filters[0].value === "boolean"
              ? { booleanValue: filters[0].value }
              : { integerValue: String(filters[0].value) },
          },
        }
      : {
          compositeFilter: {
            op: "AND",
            filters: filters.map(f => ({
              fieldFilter: {
                field: { fieldPath: f.field },
                op: "EQUAL",
                value: typeof f.value === "string"
                  ? { stringValue: f.value }
                  : typeof f.value === "boolean"
                  ? { booleanValue: f.value }
                  : { integerValue: String(f.value) },
              },
            })),
          },
        }
    : undefined;

  const body: any = { structuredQuery: { from: [{ collectionId }] } };
  if (whereClause) body.structuredQuery.where = whereClause;

  const res = await fetch(`${FIRESTORE_BASE}:runQuery`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const rows = await res.json();
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((r: any) => r.document)
    .map((r: any) => ({
      _id: r.document.name?.split("/").pop(),
      ...fieldsToObj(r.document.fields || {}),
    }));
}

async function firestoreAdd(collectionId: string, data: any, token: string): Promise<string> {
  const res = await fetch(`${FIRESTORE_BASE}/${collectionId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: objToFields(data) }),
  });
  const json = await res.json();
  return json.name?.split("/").pop() || "";
}

async function firestorePatch(collectionId: string, docId: string, data: any, token: string): Promise<void> {
  const updateMask = Object.keys(data).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&");
  await fetch(`${FIRESTORE_BASE}/${collectionId}/${docId}?${updateMask}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: objToFields(data) }),
  });
}
// --- end inlined utils ---

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
