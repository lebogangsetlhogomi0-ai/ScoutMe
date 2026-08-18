import { createHash } from "crypto";

// ── Firestore REST helpers (same pattern as agents) ────────────────────────
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || "";
const FIREBASE_PROJECT_ID = "scoutme-10";
const PLATFORM_EMAIL = process.env.PLATFORM_AGENT_EMAIL || "";
const PLATFORM_PASSWORD = process.env.PLATFORM_AGENT_PASSWORD || "";
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

async function getToken(): Promise<string> {
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

function toFields(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    if (typeof v === "string") fields[k] = { stringValue: v };
    else if (typeof v === "boolean") fields[k] = { booleanValue: v };
    else if (typeof v === "number") fields[k] = Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  return fields;
}

async function fsUpsert(docId: string, data: Record<string, any>, token: string): Promise<void> {
  const updateMask = Object.keys(data).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&");
  await fetch(`${FIRESTORE_BASE}/news/${docId}?${updateMask}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: toFields(data) }),
  });
}

// ── RSS feeds ──────────────────────────────────────────────────────────────
const RSS_FEEDS = [
  { url: "https://feeds.bbci.co.uk/sport/football/rss.xml",   category: "global",    source: "BBC Sport" },
  { url: "https://www.kickoff.com/rss",                        category: "sa",        source: "Kickoff" },
  { url: "https://www.theguardian.com/football/rss",           category: "global",    source: "The Guardian" },
  { url: "https://www.espn.com/espn/rss/soccer/news",          category: "global",    source: "ESPN" },
  { url: "https://www.skysports.com/rss/12040",                 category: "global",    source: "Sky Sports" },
  { url: "https://talksport.com/feed/",                        category: "global",    source: "talkSPORT" },
  { url: "https://www.90min.com/feed",                         category: "global",    source: "90min" },
];

// ── XML parsing helpers ────────────────────────────────────────────────────
function extractText(xml: string, tag: string): string {
  // handles both CDATA and plain text
  const re = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = xml.match(re);
  return (m?.[1] ?? m?.[2] ?? "").replace(/<[^>]+>/g, "").trim();
}

function extractLink(xml: string): string {
  // <link> in RSS can be self-closing or have a text child
  const plain = xml.match(/<link>([^<]+)<\/link>/i);
  if (plain) return plain[1].trim();
  const href = xml.match(/<link[^>]+href="([^"]+)"/i);
  if (href) return href[1];
  return "";
}

function extractImage(xml: string): string {
  const media = xml.match(/<media:content[^>]+url="([^"]+)"/i);
  if (media) return media[1];
  const enc = xml.match(/<enclosure[^>]+url="([^"]+)"/i);
  if (enc) return enc[1];
  const img = xml.match(/<img[^>]+src="([^"]+)"/i);
  if (img) return img[1];
  return "";
}

function parseItems(xml: string): Array<{ title: string; description: string; link: string; pubDate: string; imageUrl: string }> {
  const items: Array<{ title: string; description: string; link: string; pubDate: string; imageUrl: string }> = [];
  const itemRe = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    items.push({
      title:       extractText(block, "title"),
      description: extractText(block, "description").slice(0, 300),
      link:        extractLink(block),
      pubDate:     extractText(block, "pubDate"),
      imageUrl:    extractImage(block),
    });
  }
  return items;
}

// ── Auto-categorise by keywords ────────────────────────────────────────────
function categorize(title: string, defaultCat: string): string {
  const t = title.toLowerCase();
  if (t.includes("bafana") || t.includes("south africa national")) return "bafana";
  if (t.includes("psl") || t.includes("premier soccer league") || t.includes("kaizer chiefs") || t.includes("orlando pirates") || t.includes("mamelodi sundowns")) return "psl";
  if (t.includes("champions league") || t.includes(" ucl ") || t.includes("ucl:")) return "champions-league";
  if (t.includes("premier league") || t.includes(" epl ")) return "premier-league";
  if (t.includes("la liga") || t.includes("real madrid") || t.includes("barcelona")) return "laliga";
  if (t.includes("afcon") || t.includes("africa cup")) return "afcon";
  if (t.includes("world cup") || t.includes("fifa 2026") || t.includes("world cup 2026")) return "world-cup";
  if (t.includes("transfer") || t.includes(" signs ") || t.includes(" joins ") || t.includes(" signed ") || t.includes("new deal")) return "transfers";
  if (t.includes("abc motsepe") || t.includes("sab league") || t.includes("grassroots")) return "motsepe";
  if (t.includes("south africa") || t.includes("soweto") || t.includes("limpopo") || t.includes("gauteng")) return "sa";
  return defaultCat;
}

// ── Safe date parser ───────────────────────────────────────────────────────
function parseDate(dateStr: string): string {
  try {
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) return new Date().toISOString();
    return parsed.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

// ── Handler ────────────────────────────────────────────────────────────────
export default async function handler(req: any, res: any) {
  // Accept GET (Vercel cron) or POST (manual trigger)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers["authorization"] || req.headers["x-cron-secret"] || "";
    const provided = authHeader.replace(/^Bearer\s+/i, "");
    if (provided !== cronSecret) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  try {
    const token = await getToken();
    let articlesAdded = 0;
    const errors: string[] = [];

    for (const feed of RSS_FEEDS) {
      try {
        const feedRes = await fetch(feed.url, {
          headers: {
            "User-Agent": "ScoutMe/1.0 (football news aggregator; +https://scoutme-mu.vercel.app)",
            "Accept": "application/rss+xml, application/xml, text/xml",
          },
          signal: AbortSignal.timeout(8000),
        });

        if (!feedRes.ok) {
          errors.push(`${feed.source}: HTTP ${feedRes.status}`);
          continue;
        }

        const xml = await feedRes.text();
        const items = parseItems(xml);

        for (const item of items.slice(0, 15)) {
          if (!item.title || !item.link) continue;

          const docId = createHash("md5").update(item.link).digest("hex");
          const category = categorize(item.title, feed.category);
          const publishedAt = item.pubDate ? parseDate(item.pubDate) : new Date().toISOString();

          await fsUpsert(docId, {
            newsId: docId,
            title: item.title,
            description: item.description || "",
            url: item.link,
            imageUrl: item.imageUrl || "",
            source: feed.source,
            category,
            publishedAt,
            fetchedAt: new Date().toISOString(),
          }, token);

          articlesAdded++;
        }
      } catch (feedErr: any) {
        errors.push(`${feed.source}: ${feedErr.message}`);
      }
    }

    return res.status(200).json({
      success: true,
      articlesAdded,
      feedsAttempted: RSS_FEEDS.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    console.error("[fetch-news]", err);
    return res.status(500).json({ error: err.message });
  }
}
