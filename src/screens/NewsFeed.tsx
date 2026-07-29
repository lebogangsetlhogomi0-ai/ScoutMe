import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { useToast } from "../components/Toast";
import { Newspaper, ChevronRight, MessageSquare, ArrowRight, Flame, Trophy, ExternalLink } from "lucide-react";

export const NewsFeed: React.FC = () => {
  const { news } = useApp();
  const { showToast } = useToast();
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);

  // Category list
  const categories = ["ALL", "ScoutMe", "PSL", "Bafana Bafana", "Transfers", "AFCON", "ABC Motsepe", "SAB League"];

  // Category badges color mappings
  const getCategoryColorClass = (category: string) => {
    switch (category.toLowerCase()) {
      case "psl":
        return "bg-[#4da6ff]/15 text-[#4da6ff] border-[#4da6ff]/30";
      case "scoutme":
        return "bg-[#00e56b]/15 text-[#00e56b] border-[#00e56b]/30";
      case "transfers":
      case "transfer":
        return "bg-[#f5c518]/15 text-[#f5c518] border-[#f5c518]/30";
      case "afcon":
        return "bg-[#ff4444]/15 text-[#ff4444] border-[#ff4444]/30";
      case "abc motsepe":
        return "bg-[#5a8a6a]/20 text-[#5a8a6a] border-[#5a8a6a]/30";
      default:
        return "bg-[#0f2318] text-[#5a8a6a] border-[#1a3825]";
    }
  };

  // Filter news logic
  const filteredNews = news.filter(item => {
    if (activeCategory === "ALL") return true;
    return item.category.toLowerCase() === activeCategory.toLowerCase();
  });

  // Discovered database list
  const discoveries = [
    { name: "Sifiso Khumalo", signed: "Kaizer Chiefs FC U19", story: "Discovered during the eKasi Easter Play-offs after posting a dynamic 60s training drill." },
    { name: "Lwazi Ndlovu", signed: "SuperSport United Dev Academy", story: "Scout views peaked at 2,400 hits in 10 days before securing structural trial contracts." },
  ];

  return (
    <div className="flex-1 pb-24 overflow-y-auto w-full no-scrollbar px-3 space-y-6">
      
      {/* HEADER */}
      <div>
        <h2 className="text-4xl font-extrabold tracking-wider font-bebas text-white">
          Football News <span className="text-[#00e56b]">◎</span>
        </h2>
        <p className="text-xs text-[#5a8a6a] mt-0.5 font-medium uppercase font-mono">
          Grassroots Football Journalism
        </p>
      </div>

      {/* 2. TRENDING FEATURED STORY CARD */}
      {!selectedArticleId && (
        <div className="bg-[#231e0f] border-l-4 border-l-[#f5c518] border border-[#f5c518]/25 p-5 rounded-r-2xl space-y-3 shadow-xl">
          <div className="flex items-center space-x-1 text-[#f5c518]">
            <Flame className="w-4 h-4 fill-current" />
            <span className="text-[10px] font-bold uppercase tracking-widest font-mono">
              🔥 TRENDING ON SCOUTME
            </span>
          </div>
          <h3 className="text-md font-extrabold text-white leading-snug">
            Ayanda Mkhize trending — 31K views in 48 hours is sparking major professional inquiries on ScoutMe!
          </h3>
          <p className="text-xs text-[#5a8a6a] leading-relaxed">
            Local schools league midfielder is capturing global structural scout grids. At 16 years, they display tactical intelligence matching senior level configurations.
          </p>
          <div className="flex justify-between items-center text-[10px] font-mono pt-1 text-[#e8f5ee]/80">
            <span>By Journalist Lebo · 2h ago</span>
            <button 
              id="trending_read_more"
              onClick={() => showToast("Full editorial loading ✦", "info")}
              className="text-[#f5c518] hover:underline uppercase font-bold tracking-wide flex items-center space-x-1"
            >
              <span>Read More</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 3. CATEGORY FILTER SCROLL ROW */}
      <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1">
        {categories.map((cat) => {
          const active = activeCategory === cat;
          return (
            <button
              key={cat}
              id={`news_cat_${cat}`}
              onClick={() => {
                setActiveCategory(cat);
                setSelectedArticleId(null);
              }}
              className={`px-4 py-2 rounded-full text-[10.5px] font-bold uppercase tracking-wider transition-all select-none focus:outline-none whitespace-nowrap ${
                active
                  ? "bg-[#00e56b] text-[#050e08]"
                  : "bg-[#0a1a0f] border border-[#1a3825] text-[#5a8a6a] hover:text-white"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* 4. NEWS LIST CARD RENDERS */}
      <div className="space-y-4">
        
        {selectedArticleId ? (
          // Simulated Expanded Layout view
          <div className="bg-[#0a1a0f] border-t-4 border-[#00e56b] border border-[#1a3825] p-5 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-3 duration-200">
            <button 
              onClick={() => setSelectedArticleId(null)}
              className="text-xs text-[#5a8a6a] hover:text-[#00e56b]"
            >
              ← Back to News list
            </button>

            {(() => {
              const art = news.find(n => n.newsId === selectedArticleId);
              if (!art) return null;
              return (
                <div className="space-y-3">
                  <span className={`px-2 py-0.5 uppercase text-[9px] font-mono rounded border inline-block ${getCategoryColorClass(art.category)}`}>
                    {art.category}
                  </span>
                  <h4 className="text-xl font-bold text-white font-sans">{art.headline}</h4>
                  <p className="text-xs text-[#5a8a6a]">{art.timestamp} · Verified ScoutMe Reporter</p>
                  
                  <div className="h-[1px] bg-[#1a3825]/40 my-3" />
                  
                  <p className="text-xs text-[#e8f5ee]/85 leading-relaxed font-sans select-all">
                    {art.subtitle} This is a live, verified grassroots development update compiled dynamically by the Kasi Silicon NPC media desk. With hundreds of amateur leagues active across the provinces, our reports track and flag candidates performing at elite levels. Keep your video portfolios completely refreshed and updated daily to maintain high scout views metric visibility!
                  </p>
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="divide-y divide-[#1a3825]/35 bg-[#0a1a0f] border border-[#1a3825] rounded-2xl overflow-hidden shadow-md">
            {filteredNews.map((item) => (
              <div
                key={item.newsId}
                id={`news_card_${item.newsId}`}
                onClick={() => setSelectedArticleId(item.newsId)}
                className="p-4 hover:bg-[#0f2318]/50 transition duration-150 cursor-pointer flex items-center justify-between space-x-3.5"
              >
                <div className="flex-1 space-y-1.5 min-w-0">
                  <span className={`px-2 py-0.5 rounded border text-[8px] font-black uppercase font-mono tracking-tight inline-block ${getCategoryColorClass(item.category)}`}>
                    {item.category}
                  </span>
                  <p className="text-white text-xs font-bold font-sans truncate pr-4">
                    {item.headline}
                  </p>
                  <p className="text-[10.5px] text-[#5a8a6a] leading-normal line-clamp-1">
                    {item.subtitle}
                  </p>
                  <span className="text-[9.5px] text-[#5a8a6a]/70 block font-mono font-light mt-0.5">{item.timestamp}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#5a8a6a]" />
              </div>
            ))}
          </div>
        )}

      </div>

      {/* 5. DISCOVERED ON SCOUTME SECTION (grassroots players signed or trialed) */}
      <div className="space-y-3.5">
        <h3 className="text-xl font-extrabold tracking-wide font-bebas text-white uppercase">
          ✦ Discovered on ScoutMe
        </h3>

        <div className="space-y-3">
          {discoveries.map((dis, idx) => (
            <div
              key={idx}
              className="bg-[#0a1a0f] border border-[#1a3825] p-4.5 rounded-xl space-y-2relative"
            >
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-white font-sans">{dis.name}</span>
                <span className="bg-[#00e56b]/15 text-[#00e56b]/95 px-2 py-0.5 rounded-full text-[8.5px] font-black font-mono tracking-wider">
                  SIGNED ✦
                </span>
              </div>
              <div className="text-[11px] text-[#00e56b] uppercase font-mono font-medium">{dis.signed}</div>
              <p className="text-[10.5px] text-[#5a8a6a] leading-relaxed font-sans">{dis.story}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
