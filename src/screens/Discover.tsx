import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { Search, Flame, Star, Trophy, MapPin, Zap } from "lucide-react";
import { getOverallRanking } from "../utils/benchmark";
import { computeAiScore } from "../utils/aiScore";

interface DiscoverProps {
  onOpenPlayerProfile: (playerId: string) => void;
}

export const Discover: React.FC<DiscoverProps> = ({ onOpenPlayerProfile }) => {
  const { users, currentUser } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL");

  // Filter positions
  const filterPills = ["ALL", "GK", "LB", "CB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST"];

  // Players for the browse grid; all non-scout/club accounts for name search
  const players = users.filter(u => u.role === "player");
  const allSearchable = users.filter(u => u.userId !== currentUser?.userId);

  const renderMiniStars = (rating: number) => {
    const stars = [];
    const activeCount = Math.round(rating);
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span
          key={i}
          className={i <= activeCount ? "text-[#f5c518]" : "text-[#1d3324]"}
          style={{ fontSize: "11px" }}
        >
          ★
        </span>
      );
    }
    return (
      <div className="flex items-center space-x-1 py-0.5">
        <div className="flex items-center space-x-0.5">{stars}</div>
        <span className="text-[10px] font-bold text-white font-mono leading-none ml-1">
          {rating > 0 ? rating.toFixed(1) : "0.0"}
        </span>
      </div>
    );
  };

  // Dynamic filter and search logic
  const q = searchQuery.toLowerCase().trim();
  const filteredPlayers = q
    ? allSearchable.filter(u =>
        u.name.toLowerCase().includes(q) ||
        (u.position || "").toLowerCase().includes(q) ||
        (u.club || "").toLowerCase().includes(q) ||
        (u.province || "").toLowerCase().includes(q) ||
        (u.role || "").toLowerCase().includes(q)
      )
    : players.filter(pl => {
        if (activeFilter !== "ALL" && pl.position !== activeFilter) return false;
        return true;
      });

  const getRoleColorBg = () => {
    if (!currentUser) return "bg-[#00e56b]";
    switch (currentUser.role) {
      case "player": return "bg-[#00e56b]";
      case "scout": return "bg-[#f5c518]";
      case "club": return "bg-[#4da6ff]";
      default: return "bg-[#00e56b]";
    }
  };

  const getRoleTextColor = () => {
    if (!currentUser) return "text-[#00e56b]";
    switch (currentUser.role) {
      case "player": return "text-[#00e56b]";
      case "scout": return "text-[#f5c518]";
      case "club": return "text-[#4da6ff]";
      default: return "text-[#00e56b]";
    }
  };

  const getRoleBorderColor = () => {
    if (!currentUser) return "border-[#00e56b]";
    switch (currentUser.role) {
      case "player": return "border-[#00e56b]";
      case "scout": return "border-[#f5c518]";
      case "club": return "border-[#4da6ff]";
      default: return "border-[#00e56b]";
    }
  };

  const getStoryEmoji = (name: string) => {
    if (name.includes("Sipho")) return "⚽";
    if (name.includes("Thabo")) return "⚡";
    if (name.includes("Kagiso")) return "🥅";
    if (name.includes("Bongani")) return "🧤";
    if (name.includes("Ayanda")) return "💎";
    return "🏃🏾‍♂️";
  };

  return (
    <div className="flex-1 pb-24 overflow-y-auto no-scrollbar px-3 space-y-6">
      
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h2 className="text-4xl font-extrabold tracking-wider font-bebas text-white">
          Discover Players <span className="text-[#00e56b]">◈</span>
        </h2>
        <span className="text-[10px] bg-[#0f2318] text-[#00e56b] border border-[#1a3825] px-2.5 py-1 rounded font-mono">
          {players.length} TOTAL REGISTERED
        </span>
      </div>

      {/* SEARCH BAR (Instagram explore style) */}
      <div className="relative max-w-xl mx-auto">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5a8a6a]" />
        <input
          id="search_input"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search name, position, province, league..."
          className="w-full bg-[#0a1a0f] border border-[#1a3825] text-white pl-12 pr-4 py-3.5 rounded-xl placeholder-[#5a8a6a]/60 text-sm focus:border-[#00e56b] focus:ring-1 focus:ring-[#00e56b]/10"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#5a8a6a] hover:text-[#ff4444]"
          >
            Clear
          </button>
        )}
      </div>

      {/* FILTER PILLS (horizontally scrollable row) */}
      <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1">
        {filterPills.map((pill) => {
          const isActive = activeFilter === pill;
          return (
            <button
              key={pill}
              id={`filter_${pill}`}
              onClick={() => setActiveFilter(pill)}
              className={`px-4.5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all select-none focus:outline-none whitespace-nowrap ${
                isActive
                  ? `${getRoleColorBg()} text-[#050e08] shadow-md`
                  : "bg-[#0a1a0f] border border-[#1a3825] text-[#5a8a6a] hover:text-white"
              }`}
            >
              {pill}
            </button>
          );
        })}
      </div>

      {/* 4. TRENDING SECTION */}
      {!searchQuery && (
        <div className="space-y-3.5">
          <h3 className="text-xl font-extrabold tracking-wide font-bebas text-[#f5c518] flex items-center space-x-2">
            <Flame className="w-5 h-5 text-[#f5c518] fill-current" />
            <span>🔥 Trending This Week</span>
          </h3>
          <div className="flex space-x-4 overflow-x-auto no-scrollbar py-1">
            {players.filter(p => (p.votes || 0) > 800).map((tp) => (
              <div
                key={tp.userId}
                id={`trending_card_${tp.userId}`}
                onClick={() => onOpenPlayerProfile(tp.userId)}
                className="bg-[#231e0f] border border-[#f5c518]/60 p-4 rounded-xl min-w-[200px] flex flex-col justify-between cursor-pointer hover:border-[#f5c518] transition"
              >
                <div className="flex items-start justify-between">
                  <span className="text-3xl bg-[#050e08]/60 p-2 rounded-lg">{getStoryEmoji(tp.name)}</span>
                  <div className="bg-[#f5c518] text-[#050e08] text-[9.5px] font-extrabold uppercase px-2 py-0.5 rounded font-mono">
                    SCORE: {computeAiScore(tp)}
                  </div>
                </div>
                <div className="mt-4">
                  <h4 className="text-white text-sm font-bold font-sans">{tp.name}</h4>
                  <p className="text-[11px] text-[#f5c518] uppercase font-bold mt-0.5">{tp.position} · Age {tp.age}</p>
                  <div className="mt-1">
                    {renderMiniStars(tp.communityRating || 0)}
                  </div>
                  {(() => {
                    const matchedClub = users.find(u => (u.role === "club" || u.accountType === "club") && (
                      u.clubName?.toLowerCase() === tp.club?.toLowerCase() ||
                      u.name?.toLowerCase() === tp.club?.toLowerCase()
                    ));
                    if (matchedClub) {
                      return (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenPlayerProfile(matchedClub.userId);
                          }}
                          className="text-[10px] text-[#4da6ff] hover:underline hover:text-white truncate mt-1 block font-bold text-left cursor-pointer"
                        >
                          🛡️ {tp.club}
                        </button>
                      );
                    }
                    return (
                      <p className="text-[10px] text-[#5a8a6a] truncate mt-1">{tp.club}</p>
                    );
                  })()}
                </div>
                <div className="mt-3 text-[10px] text-[#5a8a6a]/90 font-mono flex items-center justify-between border-t border-[#f5c518]/20 pt-2">
                  <span>🔺 {tp.votes} Votes</span>
                  <span>{tp.province}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. PLAYER GRID (Instagram Explore Style 2-column Grid) */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#5a8a6a]">
          National Search Grid · {filteredPlayers.length} matches found
        </h3>

        {filteredPlayers.length === 0 ? (
          <div className="bg-[#0a1a0f] border border-[#1a3825] rounded-2xl p-8 text-center space-y-4">
            <p className="text-sm text-[#5a8a6a] italic">No grassroots players match your criteria. Try adjusting the filter/search term.</p>
            <button 
              onClick={() => { setActiveFilter("ALL"); setSearchQuery(""); }}
              className="px-4 py-2 bg-[#00e56b] text-[#050e08] text-xs font-bold uppercase tracking-wide rounded-xl"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5">
            {filteredPlayers.map((pl) => (
              <div
                key={pl.userId}
                id={`grid_player_${pl.userId}`}
                onClick={() => onOpenPlayerProfile(pl.userId)}
                className="bg-[#0a1a0f] border border-[#1a3825] rounded-xl overflow-hidden cursor-pointer hover:border-[#00e56b]/45 transition group"
              >
                {/* Visual Top (Grid flag emoji represents background / photo mock) */}
                <div className="relative h-28 bg-[#050e08] flex items-center justify-center border-b border-[#1a3825]/40 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a1a0f]/90 to-transparent" />
                  
                  {/* Big emoji mockup */}
                  <span className="text-6xl group-hover:scale-110 transition duration-300 relative z-10">
                    {getStoryEmoji(pl.name)}
                  </span>

                  {/* Top Right: AI Score badge */}
                  <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide z-10 select-none ${getRoleColorBg()} text-[#050e08]`}>
                    AI {computeAiScore(pl)}
                  </div>

                  {/* Top Left: Scout Endorsed star (if endorsed) */}
                  {pl.endorsed && (
                    <div className="absolute top-2 left-2 bg-[#f5c518] p-1 rounded z-10">
                      <Star className="w-3.5 h-3.5 text-[#050e08] fill-current" />
                    </div>
                  )}

                  {/* Province Badge over corner */}
                  <div className="absolute bottom-2 left-2 flex items-center space-x-1 text-[9px] text-[#5a8a6a] bg-[#050e08] px-1.5 py-0.5 rounded border border-[#1a3825]">
                    <MapPin className="w-2.5 h-2.5 text-[#00e56b]" />
                    <span>{pl.province}</span>
                  </div>
                </div>

                {/* Bottom Text Area */}
                <div className="p-3.5 space-y-1.5">
                  <h4 className="text-white text-xs font-bold font-sans leading-tight truncate group-hover:text-[#00e56b] transition">
                    {pl.name}
                  </h4>

                  {pl.role === "player" ? (
                    <>
                      {(() => {
                        const ranking = (pl.pace && pl.vision && pl.finishing) ? getOverallRanking(pl, pl.position || "ST") : null;
                        return ranking ? (
                          <div className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-sans font-black uppercase" style={{ backgroundColor: `${ranking.color}15`, color: ranking.color, border: `1px solid ${ranking.color}35` }}>
                            {ranking.badge}
                          </div>
                        ) : null;
                      })()}
                      <div className="flex justify-between items-center text-[10.5px] font-sans font-semibold font-bold">
                        <span className={`${getRoleTextColor()} bg-[#0f2318] px-1.5 py-0.5 rounded uppercase`}>{pl.position}</span>
                        <span className="text-[#5a8a6a]">Age {pl.age}</span>
                      </div>
                      {renderMiniStars(pl.communityRating || 0)}
                      <div className="pt-2 border-t border-[#1a3825]/40 flex justify-between text-[9px] text-[#5a8a6a] font-mono">
                        <span>🔺 {pl.votes} votes</span>
                        <span>👁️ {pl.views} views</span>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-1">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-[#0f2318] text-[#5a8a6a]">
                        {pl.role === "platform" ? "⭐ Official" : pl.role === "fan" ? "👤 Fan" : pl.role === "scout" ? "🔍 Scout" : pl.role}
                      </span>
                      <p className="text-[10px] text-[#5a8a6a] truncate">{pl.province}</p>
                    </div>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
