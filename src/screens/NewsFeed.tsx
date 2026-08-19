import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, limit, onSnapshot, where, Query, DocumentData } from "firebase/firestore";
import { Search, ExternalLink, RefreshCw, X } from "lucide-react";
import { formatSATimeAgo } from "../utils/saTime";

// ── Sport filters ──────────────────────────────────────────────────────────
const SPORT_FILTERS = [
  { id: "scoutme",  label: "ScoutMe",    emoji: "⭐", color: "#00e56b" },
  { id: "football", label: "Football",   emoji: "⚽", color: "#00e56b" },
  { id: "rugby",    label: "Rugby",      emoji: "🏉", color: "#f5c518" },
  { id: "cricket",  label: "Cricket",    emoji: "🏏", color: "#4da6ff" },
  { id: "all",      label: "All Sports", emoji: "🌍", color: "#5a8a6a" },
] as const;

type SportFilter = (typeof SPORT_FILTERS)[number]["id"];

const FOOTBALL_CATS = [
  "premier-league", "psl", "sa", "bafana", "afcon",
  "world-cup", "champions-league", "laliga", "transfers", "ddc",
];

// ── Category badge labels ──────────────────────────────────────────────────
const CAT_LABELS: Record<string, string> = {
  "premier-league":   "PREMIER LEAGUE",
  "champions-league": "UCL",
  "laliga":           "LA LIGA",
  "transfers":        "TRANSFERS",
  "afcon":            "AFCON",
  "world-cup":        "WORLD CUP",
  "psl":              "PSL",
  "sa":               "AFRICA",
  "bafana":           "SAFA",
  "ddc":              "DDC",
  "rugby":            "RUGBY",
  "cricket":          "CRICKET",
};

const CAT_COLORS: Record<string, string> = {
  "premier-league": "#4da6ff", "champions-league": "#4da6ff", "laliga": "#4da6ff",
  "transfers": "#f5c518", "afcon": "#f5c518", "world-cup": "#f5c518",
  "psl": "#00e56b", "sa": "#00e56b", "bafana": "#00e56b", "ddc": "#00e56b",
  "rugby": "#f5c518", "cricket": "#4da6ff",
};

// ── Non-football filter (only applied on football/all tabs) ────────────────
const NON_SPORT_TERMS = [
  "celebrity","entertainment","politics","murder","crime","accident",
  "load shedding","eskom","lottery","lotto","netball","volleyball",
];
function isCleanArticle(title: string, desc: string): boolean {
  const t = (title + " " + desc).toLowerCase();
  return !NON_SPORT_TERMS.some(term => t.includes(term));
}

interface NewsArticle {
  newsId: string; title: string; description: string;
  url: string; imageUrl: string; source: string;
  category: string; publishedAt: string;
}

interface ScoutMePost {
  postId: string; caption: string; contentType: string;
  playerName?: string; createdAt: string; userId: string;
}

const SkeletonCard: React.FC = () => (
  <div className="p-4 flex space-x-3 animate-pulse">
    <div className="w-16 h-16 rounded-lg bg-[#1a3825]/40 flex-shrink-0" />
    <div className="flex-1 space-y-2 py-1">
      <div className="h-2 bg-[#1a3825]/40 rounded w-1/4" />
      <div className="h-3 bg-[#1a3825]/50 rounded w-full" />
      <div className="h-3 bg-[#1a3825]/40 rounded w-3/4" />
      <div className="h-2 bg-[#1a3825]/30 rounded w-1/3" />
    </div>
  </div>
);

export const NewsFeed: React.FC = () => {
  const [activeSport, setActiveSport] = useState<SportFilter>("football");
  const [search, setSearch] = useState("");
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [scoutmePosts, setScoutmePosts] = useState<ScoutMePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch news ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!db || activeSport === "scoutme") return;
    setLoading(true);
    setError(null);

    let q: Query<DocumentData>;
    if (activeSport === "football") {
      q = query(collection(db, "news"), where("category", "in", FOOTBALL_CATS), limit(80));
    } else if (activeSport === "rugby") {
      q = query(collection(db, "news"), where("category", "==", "rugby"), limit(60));
    } else if (activeSport === "cricket") {
      q = query(collection(db, "news"), where("category", "==", "cricket"), limit(60));
    } else {
      q = query(collection(db, "news"), orderBy("publishedAt", "desc"), limit(80));
    }

    const unsub = onSnapshot(q, (snap) => {
      const items: NewsArticle[] = snap.docs
        .map(d => ({
          newsId: d.id,
          title: d.data().title || "",
          description: d.data().description || "",
          url: d.data().url || "",
          imageUrl: d.data().imageUrl || "",
          source: d.data().source || "",
          category: d.data().category || "",
          publishedAt: d.data().publishedAt || "",
        }))
        .filter(a => isCleanArticle(a.title, a.description))
        .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
        .slice(0, 40);
      setArticles(items);
      setLoading(false);
    }, () => {
      setError("Could not load news.");
      setLoading(false);
    });

    return () => unsub();
  }, [activeSport]);

  // ── Fetch ScoutMe posts ────────────────────────────────────────────────
  useEffect(() => {
    if (!db || activeSport !== "scoutme") return;
    setLoading(true);
    setError(null);
    const q = query(
      collection(db, "posts"),
      where("isOfficialPost", "==", true),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    const unsub = onSnapshot(q, (snap) => {
      setScoutmePosts(snap.docs.map(d => ({
        postId: d.id,
        caption: d.data().caption || "",
        contentType: d.data().contentType || "",
        playerName: d.data().playerName || d.data().featuredPlayerName || "",
        createdAt: d.data().createdAt || "",
        userId: d.data().userId || "",
      })));
      setLoading(false);
    }, () => { setError("Could not load ScoutMe posts."); setLoading(false); });
    return () => unsub();
  }, [activeSport]);

  const handleSportChange = (id: SportFilter) => {
    if (id === activeSport) return;
    setActiveSport(id);
    setSearch("");
    setArticles([]);
    setScoutmePosts([]);
    setLoading(true);
  };

  // Client-side search filter
  const q = search.toLowerCase().trim();
  const visibleArticles = q
    ? articles.filter(a => a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q))
    : articles;

  const contentTypeLabel = (ct: string) => ({
    player_of_week: "🏆 PLAYER OF THE WEEK",
    signing: "✍️ SIGNING",
    most_improved: "📈 MOST IMPROVED",
    trial_challenge: "⚡ CHALLENGE",
    platform_update: "📢 UPDATE",
  }[ct] || ct.toUpperCase());

  const activeMeta = SPORT_FILTERS.find(s => s.id === activeSport)!;

  return (
    <div className="flex-1 pb-24 overflow-y-auto w-full no-scrollbar px-3 space-y-4">

      {/* HEADER */}
      <div>
        <h2 className="text-4xl font-extrabold tracking-wider font-bebas text-white">
          Sports News <span className="text-[#00e56b]">◎</span>
        </h2>
        <p className="text-[10px] text-[#5a8a6a] uppercase font-mono tracking-wider">
          Live · Football · Rugby · Cricket
        </p>
      </div>

      {/* SPORT FILTER PILLS */}
      <div className="flex space-x-2 overflow-x-auto no-scrollbar py-0.5">
        {SPORT_FILTERS.map(sf => {
          const isActive = activeSport === sf.id;
          return (
            <button
              key={sf.id}
              onClick={() => handleSportChange(sf.id)}
              className="flex-shrink-0 flex items-center space-x-1.5 px-4 py-2 rounded-full text-[11px] font-bold tracking-wide transition-all focus:outline-none whitespace-nowrap"
              style={isActive
                ? { backgroundColor: sf.color, color: "#050e08" }
                : { backgroundColor: "#0a1a0f", border: "1px solid #1a3825", color: "#5a8a6a" }
              }
            >
              <span>{sf.emoji}</span>
              <span>{sf.label}</span>
            </button>
          );
        })}
      </div>

      {/* SEARCH BAR (hidden on ScoutMe tab) */}
      {activeSport !== "scoutme" && (
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a8a6a]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${activeMeta.label.toLowerCase()} news...`}
            className="w-full bg-[#0a1a0f] border border-[#1a3825] text-white pl-10 pr-9 py-2.5 rounded-xl text-sm placeholder-[#5a8a6a]/60 focus:border-[#00e56b] focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-[#5a8a6a]" />
            </button>
          )}
        </div>
      )}

      {/* CONTENT */}
      {error ? (
        <div className="bg-[#0a1a0f] border border-[#1a3825] rounded-2xl p-8 text-center space-y-4">
          <p className="text-sm text-[#ff4444]">Could not load news.</p>
          <button
            onClick={() => { setError(null); setLoading(true); setActiveSport(s => s); }}
            className="flex items-center space-x-1.5 mx-auto px-4 py-2 bg-[#0f2318] border border-[#1a3825] rounded-xl text-xs text-[#00e56b] font-bold"
          >
            <RefreshCw className="w-3.5 h-3.5" /><span>Retry</span>
          </button>
        </div>

      ) : loading ? (
        <div className="bg-[#0a1a0f] border border-[#1a3825] rounded-2xl overflow-hidden divide-y divide-[#1a3825]/40">
          {[1,2,3,4,5].map(i => <SkeletonCard key={i} />)}
        </div>

      ) : activeSport === "scoutme" ? (
        scoutmePosts.length === 0 ? (
          <div className="bg-[#0a1a0f] border border-[#1a3825] rounded-2xl p-10 text-center text-xs text-[#5a8a6a] italic">
            No ScoutMe posts yet. Check back soon. ◎
          </div>
        ) : (
          <div className="space-y-3">
            {scoutmePosts.map(post => (
              <div key={post.postId} className="bg-[#0a1a0f] border border-[#1a3825] rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase font-mono px-2 py-0.5 rounded" style={{ backgroundColor: "#00e56b22", color: "#00e56b", border: "1px solid #00e56b44" }}>
                    {contentTypeLabel(post.contentType)}
                  </span>
                  <span className="text-[9px] text-[#5a8a6a] font-mono">{formatSATimeAgo(post.createdAt)}</span>
                </div>
                <p className="text-white text-xs font-bold leading-snug line-clamp-3">{post.caption}</p>
                {post.playerName && <p className="text-[10px] text-[#00e56b] font-mono">⚽ {post.playerName}</p>}
              </div>
            ))}
          </div>
        )

      ) : visibleArticles.length === 0 ? (
        <div className="bg-[#0a1a0f] border border-[#1a3825] rounded-2xl p-10 text-center text-xs text-[#5a8a6a] italic">
          {q ? `No results for "${search}"` : "No news yet. Check back soon. ◎"}
        </div>

      ) : (
        <div className="bg-[#0a1a0f] border border-[#1a3825] rounded-2xl overflow-hidden divide-y divide-[#1a3825]/35 shadow-md">
          {visibleArticles.map(item => {
            const color = CAT_COLORS[item.category] ?? "#5a8a6a";
            const label = CAT_LABELS[item.category] ?? item.category.toUpperCase();
            const sportEmoji = item.category === "rugby" ? "🏉" : item.category === "cricket" ? "🏏" : "⚽";
            return (
              <a
                key={item.newsId}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start space-x-3 p-4 hover:bg-[#0f2318]/50 transition duration-150 cursor-pointer"
              >
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt="" loading="lazy"
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0 bg-[#1a3825]/30"
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg flex-shrink-0 flex items-center justify-center text-2xl" style={{ backgroundColor: `${color}15` }}>
                    {sportEmoji}
                  </div>
                )}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <span className="text-[8px] font-black uppercase font-mono px-1.5 py-0.5 rounded inline-block"
                    style={{ backgroundColor: `${color}18`, color, border: `1px solid ${color}35` }}>
                    {label}
                  </span>
                  <p className="text-white text-[13px] font-bold font-sans leading-snug line-clamp-2">{item.title}</p>
                  {item.description && (
                    <p className="text-[11px] text-[#5a8a6a] leading-normal line-clamp-2">{item.description}</p>
                  )}
                  <div className="flex items-center justify-between text-[9.5px] text-[#5a8a6a]/70 font-mono">
                    <span>{item.source} · {formatSATimeAgo(item.publishedAt)}</span>
                    <ExternalLink className="w-3 h-3 text-[#5a8a6a]/50" />
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
};
