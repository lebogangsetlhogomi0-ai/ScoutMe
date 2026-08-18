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
  { url: "https://feeds.bbci.co.uk/sport/football/rss.xml",   category: "premier-league", source: "BBC Sport" },
  { url: "https://www.kickoff.com/rss",                        category: "sa",             source: "Kickoff" },
  { url: "https://www.theguardian.com/football/rss",           category: "premier-league", source: "The Guardian" },
  { url: "https://www.espn.com/espn/rss/soccer/news",          category: "premier-league", source: "ESPN" },
  { url: "https://www.skysports.com/rss/12040",                category: "premier-league", source: "Sky Sports" },
  { url: "https://talksport.com/feed/",                        category: "premier-league", source: "talkSPORT" },
  { url: "https://www.90min.com/feed",                         category: "premier-league", source: "90min" },
  { url: "https://fabrizioromano.substack.com/feed",           category: "transfers",      source: "Fabrizio Romano" },
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
function categorize(title: string, desc: string, defaultCat: string): string {
  const t = (title + " " + desc).toLowerCase();

  // SA / Bafana (check before PSL so national team takes priority)
  if (t.includes("bafana") || t.includes("south africa national") || t.includes("safa ") || t.includes("south african football association")) return "bafana";

  // PSL / SA club football
  if (
    t.includes("psl") || t.includes("premier soccer league") ||
    t.includes("kaizer chiefs") || t.includes("orlando pirates") ||
    t.includes("mamelodi sundowns") || t.includes("supersport united") ||
    t.includes("cape town city") || t.includes("stellenbosch fc") ||
    t.includes("amazulu") || t.includes("chippa united") ||
    t.includes("sekhukhune") || t.includes("golden arrows") ||
    t.includes("ts galaxy") || t.includes("moroka swallows") ||
    t.includes("nedbank cup") || t.includes("mtn8") ||
    t.includes("absa premiership") || t.includes("dstv premiership")
  ) return "psl";

  // AFCON / African football (before generic SA check)
  if (
    t.includes("afcon") || t.includes("africa cup") ||
    t.includes("chan ") || t.includes("wafu") ||
    t.includes("cosafa") || t.includes("caf ") ||
    t.includes("nations cup")
  ) return "afcon";

  // World Cup
  if (
    t.includes("world cup") || t.includes("fifa 2026") ||
    t.includes("2026 world cup") || t.includes("2030 world cup") ||
    t.includes("world cup 2026") || t.includes("world cup qualifier") ||
    t.includes("wc qualifier")
  ) return "world-cup";

  // Champions League (before Premier League / La Liga so UCL stories aren't misclassified)
  if (
    t.includes("champions league") || t.includes(" ucl ") ||
    t.includes("ucl:") || t.includes("europa league") ||
    t.includes("conference league") || t.includes("club world cup")
  ) return "champions-league";

  // La Liga
  if (
    t.includes("la liga") || t.includes("laliga") ||
    t.includes("real madrid") || t.includes("barcelona") ||
    t.includes("atletico madrid") || t.includes("atlético") ||
    t.includes("sevilla") || t.includes("villarreal") ||
    t.includes("athletic bilbao") || t.includes("real sociedad") ||
    t.includes("valencia cf") || t.includes("osasuna") ||
    t.includes("betis") || t.includes("celta vigo")
  ) return "laliga";

  // Premier League (English clubs)
  if (
    t.includes("premier league") || t.includes(" epl ") ||
    t.includes("man city") || t.includes("manchester city") ||
    t.includes("man united") || t.includes("manchester united") ||
    t.includes("arsenal") || t.includes("chelsea") ||
    t.includes("liverpool") || t.includes("tottenham") || t.includes("spurs") ||
    t.includes("newcastle") || t.includes("aston villa") ||
    t.includes("west ham") || t.includes("brighton") ||
    t.includes("everton") || t.includes("fulham") ||
    t.includes("brentford") || t.includes("wolves") ||
    t.includes("wolverhampton") || t.includes("nottingham forest") ||
    t.includes("crystal palace") || t.includes("bournemouth") ||
    t.includes("leicester") || t.includes("southampton") ||
    t.includes("ipswich") || t.includes("fa cup") || t.includes("carabao cup") ||
    t.includes("league cup")
  ) return "premier-league";

  // Transfers (check after league-specific so a "signs for Man City" goes to transfers)
  if (
    t.includes("transfer") || t.includes(" signs ") || t.includes(" joins ") ||
    t.includes(" signed ") || t.includes("new deal") || t.includes("loan deal") ||
    t.includes("fee agreed") || t.includes("unveiled") || t.includes("on loan") ||
    t.includes("contract extension") || t.includes("released by") ||
    t.includes("free agent") || t.includes("bid accepted") ||
    t.includes("medical") || t.includes("official: ") || t.includes("confirmed:")
  ) return "transfers";

  // ABC Motsepe / grassroots SA
  if (
    t.includes("abc motsepe") || t.includes("sab league") ||
    t.includes("grassroots") || t.includes("nfdk") ||
    t.includes("national first division") || t.includes("glad africa") ||
    t.includes("abc league")
  ) return "motsepe";

  // Generic South Africa football
  if (
    t.includes("south africa") || t.includes("soweto") ||
    t.includes("limpopo") || t.includes("gauteng") ||
    t.includes("cape town") || t.includes("durban") ||
    t.includes("johannesburg") || t.includes("pretoria") ||
    t.includes("mzansi") || t.includes("sa football")
  ) return "sa";

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
          const category = categorize(item.title, item.description, feed.category);
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
