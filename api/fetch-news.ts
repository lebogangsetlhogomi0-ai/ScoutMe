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

// ── RSS feeds (football-only endpoints) ───────────────────────────────────
const RSS_FEEDS = [
  // International
  { url: "https://feeds.bbci.co.uk/sport/football/rss.xml",        category: "premier-league", source: "BBC Sport" },
  { url: "https://www.theguardian.com/football/rss",                category: "premier-league", source: "The Guardian" },
  { url: "https://www.espn.com/espn/rss/soccer/news",               category: "premier-league", source: "ESPN FC" },
  { url: "https://www.skysports.com/rss/12040",                     category: "premier-league", source: "Sky Sports Football" },
  { url: "https://talksport.com/football/feed/",                    category: "premier-league", source: "talkSPORT Football" },
  { url: "https://www.90min.com/feed",                              category: "premier-league", source: "90min" },
  { url: "https://fabrizioromano.substack.com/feed",                category: "transfers",      source: "Fabrizio Romano" },
  // South Africa (parallel fetch; failures skipped silently)
  { url: "https://feeds.bbci.co.uk/sport/africa/rss.xml",                        category: "sa",     source: "BBC Sport Africa" },
  { url: "https://www.cafonline.com/rss/news",                                    category: "bafana", source: "CAF Online" },
  { url: "https://www.sport24.co.za/Soccer/rss",                                  category: "psl",    source: "Sport24 Soccer" },
  { url: "https://supersport.com/rss/soccer",                                     category: "psl",    source: "SuperSport Soccer" },
  { url: "https://www.timeslive.co.za/sport/soccer/feed/",                        category: "psl",    source: "Times Live Soccer" },
  { url: "https://www.kickoff.com/rss/news.xml",                                  category: "psl",    source: "KickOff" },
  { url: "https://www.soccer-laduma.co.za/feed/",                                 category: "psl",    source: "Soccer Laduma" },
  { url: "https://www.iol.co.za/sport/soccer/rss",                                category: "sa",     source: "IOL Soccer" },
  { url: "https://www.goal.com/en-za/feeds/news",                                 category: "psl",    source: "Goal ZA" },
  { url: "https://www.thesouthafrican.com/sport/football/feed/",                  category: "psl",    source: "The South African" },
  { url: "https://www.thesouthafrican.com/feed/",                                 category: "sa",     source: "The South African" },
  { url: "https://www.dailysun.co.za/sport/feed/",                                category: "psl",    source: "Daily Sun Sport" },
  { url: "https://afri-foot.com/feed/",                                            category: "psl",    source: "Afri-Foot" },
  { url: "https://www.hollywoodbets.net/blog/feed/",                              category: "psl",    source: "HollywoodBets Blog" },
];

// ── Non-football sport keywords to reject ─────────────────────────────────
const NON_FOOTBALL_TERMS = [
  "boxing", "tyson fury", "anthony joshua", "canelo", "ufc", "mma", "wwe",
  "nba", "lebron james", "stephen curry", "nfl", "super bowl", "american football",
  "tennis", "wimbledon", "us open", "australian open", "french open", "rafael nadal", "novak djokovic",
  "golf", "masters ", "pga tour", "ryder cup", "tiger woods",
  "cricket", "test match", "ashes", "ipl", "t20 world cup",
  "rugby union", "six nations", "rugby world cup", "rugby league",
  "formula 1", "f1 ", "grand prix", "motogp",
  "cycling", "tour de france",
  "swimming", "athletics", "olympics",
  "snooker", "darts",
  "horse racing", "cheltenham",
];

function isFootball(title: string, desc: string): boolean {
  const t = (title + " " + desc).toLowerCase();
  return !NON_FOOTBALL_TERMS.some(term => t.includes(term));
}

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
  if (
    t.includes("bafana") || t.includes("banyana") ||
    t.includes("south africa national") || t.includes("safa ") ||
    t.includes("south african football association") ||
    t.includes("hugo broos") || t.includes("ronwen williams") ||
    t.includes("evidence makgopa") || t.includes("percy tau") ||
    t.includes("cosafa") || t.includes("afcon qualifier") ||
    t.includes("world cup qualifier") && t.includes("south africa")
  ) return "bafana";

  // PSL / SA club football
  if (
    t.includes("psl") || t.includes("premier soccer league") ||
    t.includes("betway premiership") || t.includes("dstv premiership") ||
    t.includes("soweto derby") || t.includes("nedbank cup") || t.includes("mtn8") ||
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

  // DDC / Diski Challenge / grassroots SA
  if (
    t.includes("diski challenge") || t.includes(" ddc ") || t.includes("ddc:") ||
    t.includes("abc motsepe") || t.includes("sab league") ||
    t.includes("grassroots") || t.includes("national first division") ||
    t.includes("glad africa")
  ) return "ddc";

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

// ── Guardian API search (free "test" key — no registration needed) ─────────
const GUARDIAN_SEARCHES = [
  { q: "PSL \"Premier Soccer League\" OR \"Kaizer Chiefs\" OR \"Orlando Pirates\" OR \"Mamelodi Sundowns\" OR \"Betway Premiership\"", category: "psl",    source: "The Guardian" },
  { q: "\"Bafana Bafana\" OR \"Banyana Banyana\" OR \"Hugo Broos\" OR \"Percy Tau\" OR \"South Africa football national\"",           category: "bafana", source: "The Guardian" },
  { q: "\"Diski Challenge\" OR \"National First Division\" football \"South Africa\"",                                                  category: "ddc",    source: "The Guardian" },
  { q: "AFCON OR \"Africa Cup of Nations\" OR CAF football 2024 2025",                                                                 category: "afcon",  source: "The Guardian" },
];

async function fetchGuardian(search: typeof GUARDIAN_SEARCHES[0]): Promise<Array<{ title: string; url: string; publishedAt: string; imageUrl: string; category: string }>> {
  const url = `https://content.guardianapis.com/search?q=${encodeURIComponent(search.q)}&section=football&show-fields=thumbnail&page-size=20&order-by=newest&api-key=test`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Guardian HTTP ${res.status}`);
  const data = await res.json();
  return (data?.response?.results || []).map((r: any) => ({
    title: r.webTitle || "",
    url: r.webUrl || "",
    publishedAt: r.webPublicationDate || new Date().toISOString(),
    imageUrl: r.fields?.thumbnail || "",
    category: search.category,
    source: search.source,
  }));
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

    // Fetch ALL feeds in parallel (3s timeout each) so we finish well inside
    // Vercel Hobby's 10s function limit instead of timing out on later feeds.
    const feedResults = await Promise.allSettled(
      RSS_FEEDS.map(async (feed) => {
        const feedRes = await fetch(feed.url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; ScoutMe/1.0; +https://scoutme-mu.vercel.app)",
            "Accept": "application/rss+xml, application/xml, text/xml, */*",
          },
          signal: AbortSignal.timeout(5000),
        });
        if (!feedRes.ok) throw new Error(`HTTP ${feedRes.status}`);
        const xml = await feedRes.text();
        return { feed, xml };
      })
    );

    // Write articles for all feeds that responded
    const perFeedNow = new Date().toISOString();
    const writeOps: Promise<void>[] = [];

    for (const result of feedResults) {
      if (result.status === "rejected") {
        errors.push(`${result.reason}`);
        continue;
      }
      const { feed, xml } = result.value;
      const items = parseItems(xml);
      const perFeed = feed.category === "psl" || feed.category === "sa" || feed.category === "bafana" || feed.category === "afcon" || feed.category === "ddc" ? 20 : 15;

      for (const item of items.slice(0, perFeed)) {
        if (!item.title || !item.link) continue;
        if (!isFootball(item.title, item.description)) continue;

        const docId = createHash("md5").update(item.link).digest("hex");
        const category = categorize(item.title, item.description, feed.category);
        const publishedAt = item.pubDate ? parseDate(item.pubDate) : perFeedNow;

        writeOps.push(
          fsUpsert(docId, {
            newsId: docId,
            title: item.title,
            description: item.description || "",
            url: item.link,
            imageUrl: item.imageUrl || "",
            source: feed.source,
            category,
            publishedAt,
            fetchedAt: perFeedNow,
          }, token).then(() => { articlesAdded++; })
        );
      }
    }

    // Also fetch Guardian API results for SA-specific categories
    const guardianResults = await Promise.allSettled(GUARDIAN_SEARCHES.map(fetchGuardian));
    for (const result of guardianResults) {
      if (result.status === "rejected") { errors.push(`Guardian: ${result.reason}`); continue; }
      for (const item of result.value) {
        if (!item.title || !item.url) continue;
        const docId = createHash("md5").update(item.url).digest("hex");
        const category = categorize(item.title, "", item.category);
        writeOps.push(
          fsUpsert(docId, {
            newsId: docId,
            title: item.title,
            description: "",
            url: item.url,
            imageUrl: item.imageUrl,
            source: item.source,
            category,
            publishedAt: item.publishedAt,
            fetchedAt: perFeedNow,
          }, token).then(() => { articlesAdded++; })
        );
      }
    }

    await Promise.allSettled(writeOps);

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
