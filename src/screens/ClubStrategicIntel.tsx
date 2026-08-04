import React from "react";
import { useApp } from "../context/AppContext";
import { useToast } from "../components/Toast";
import { Star, ShieldAlert, Users, Film, CheckCircle, BarChart2, Trash2, Zap } from "lucide-react";
import { computeAiScore } from "../utils/aiScore";

interface ClubStrategicIntelProps {
  onOpenPlayerProfile: (playerId: string) => void;
}

export const ClubStrategicIntel: React.FC<ClubStrategicIntelProps> = ({ onOpenPlayerProfile }) => {
  const { shortlist, users, toggleShortlist, currentUser, trialEvents, trialEventApplications } = useApp();
  const { showToast } = useToast();

  // Filter trial applications for this club
  const myClubId = currentUser?.userId;
  const myTrialEvents = trialEvents.filter(e => e.clubId === myClubId || currentUser?.role === "club");
  const myTrialApplications = trialEventApplications.filter(app =>
    myTrialEvents.some(e => e.trialEventId === app.trialEventId)
  );

  // Find shortlisted player profiles
  const shortlistedPlayers = users.filter(usr => shortlist.includes(usr.userId));

  const demandStats = [
    { pos: "ST", desc: "Striker", count: 23, color: "bg-[#00e56b]", width: "w-full" },
    { pos: "LB", desc: "Left Back", count: 17, color: "bg-[#f5c518]", width: "w-10/12" },
    { pos: "GK", desc: "Goalkeeper", count: 14, color: "bg-[#4da6ff]", width: "w-8/12" },
    { pos: "CM", desc: "Central Midfield", count: 11, color: "bg-[#5a8a6a]", width: "w-6/12" }
  ];

  const getStoryEmoji = (name: string) => {
    if (name.includes("Sipho")) return "⚽";
    if (name.includes("Thabo")) return "⚡";
    if (name.includes("Kagiso")) return "🥅";
    if (name.includes("Bongani")) return "🧤";
    if (name.includes("Ayanda")) return "💎";
    return "🏃🏾‍♂️";
  };

  return (
    <div className="flex-1 pb-24 overflow-y-auto w-full no-scrollbar px-3 space-y-6">
      
      {/* HEADER */}
      <div>
        <h2 className="text-4xl font-extrabold tracking-wider font-bebas text-[#4da6ff] uppercase flex items-center space-x-2">
          <span>Club Strategic Intel ⬡</span>
        </h2>
        <p className="text-xs text-[#5a8a6a] mt-0.5 font-medium uppercase font-mono">
          Ecosystem Dashboard & Shortlist Audit
        </p>
      </div>

      {/* 2. 2X2 METRICS GRID */}
      <div className="grid grid-cols-2 gap-3.5">
        
        {/* Card 1 */}
        <div className="bg-[#0a1a0f] border border-[#1a3825] p-4 rounded-xl relative overflow-hidden">
          <span className="text-[10px] text-[#5a8a6a] block uppercase font-mono">Players Registered</span>
          <span className="text-2xl font-black font-mono text-white block mt-1">12,847</span>
          <span className="text-[9.5px] font-semibold text-[#00e56b] block mt-1">+234 this week</span>
        </div>

        {/* Card 2 */}
        <div className="bg-[#0a1a0f] border border-[#1a3825] p-4 rounded-xl relative overflow-hidden">
          <span className="text-[10px] text-[#5a8a6a] block uppercase font-mono">Scouts Active</span>
          <span className="text-2xl font-black font-mono text-white block mt-1">1,203</span>
          <span className="text-[9.5px] font-semibold text-[#f5c518] block mt-1">+89 this week</span>
        </div>

        {/* Card 3 */}
        <div className="bg-[#0a1a0f] border border-[#1a3825] p-4 rounded-xl relative overflow-hidden">
          <span className="text-[10px] text-[#5a8a6a] block uppercase font-mono">Clubs Subscribed</span>
          <span className="text-2xl font-black font-mono text-white block mt-1">347</span>
          <span className="text-[9.5px] font-semibold text-[#4da6ff] block mt-1">+12 this week</span>
        </div>

        {/* Card 4 */}
        <div className="bg-[#0a1a0f] border border-[#1a3825] p-4 rounded-xl relative overflow-hidden">
          <span className="text-[10px] text-[#5a8a6a] block uppercase font-mono">Videos Uploaded</span>
          <span className="text-2xl font-black font-mono text-white block mt-1">48,291</span>
          <span className="text-[9.5px] font-semibold text-[#5a8a6a] block mt-1">+1,204 this week</span>
        </div>

      </div>

      {/* 3. POSITIONS IN DEMAND THIS WEEK (bar chart style display) */}
      <div className="bg-[#0a1a0f] border border-[#1a3825] p-5 rounded-2xl space-y-4">
        <h3 className="text-lg font-extrabold font-bebas tracking-wide text-white uppercase flex items-center space-x-2">
          <BarChart2 className="w-5 h-5 text-[#4da6ff]" />
          <span>📊 Positions in Demand This Week</span>
        </h3>

        <div className="space-y-4">
          {demandStats.map((stat) => (
            <div key={stat.pos} className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-semibold">
                <div className="flex items-center space-x-2">
                  <span className="px-1.5 py-0.5 rounded bg-[#050e08] text-[#e8f5ee] font-mono text-[10.5px] border border-[#1a3825]">
                    {stat.pos}
                  </span>
                  <span className="text-[#5a8a6a] text-[11px]">{stat.desc}</span>
                </div>
                <span className="text-[10px] bg-[#050e08] text-[#00e56b] border border-[#1a3825] px-2 py-0.5 rounded font-mono">
                  {stat.count} clubs searching
                </span>
              </div>
              <div className="h-2.5 bg-[#050e08] rounded-full overflow-hidden border border-[#1a3825]/45">
                <div className={`h-full ${stat.color} ${stat.width} rounded-full`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. SHORTLIST MANAGER (My Shortlist) */}
      <div className="bg-[#0a1a0f] border border-[#1a3825] p-5 rounded-2xl space-y-4">
        <h3 className="text-lg font-extrabold font-bebas tracking-wide text-white uppercase">
          ⭐ My Saved Shortlist ({shortlistedPlayers.length})
        </h3>

        {shortlistedPlayers.length === 0 ? (
          <div className="text-center p-6 bg-[#050e08]/60 border border-[#1a3825] rounded-xl text-xs text-[#5a8a6a] italic space-y-3">
            <p>No players saved to your shortlist yet.</p>
            <p className="text-[10px] text-[#5a8a6a]/70">Use the Search / Discover grids to bookmark elite talent for instant trial monitoring.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {shortlistedPlayers.map((player) => (
              <div
                key={player.userId}
                id={`shortlist_item_${player.userId}`}
                className="bg-[#050e08]/90 p-3 rounded-xl border border-[#1a3825] flex items-center justify-between"
              >
                <div className="flex items-center space-x-3.5">
                  <span className="text-2xl">{getStoryEmoji(player.name)}</span>
                  <div>
                    <h4 className="text-white text-xs font-bold font-sans">{player.name}</h4>
                    <span className="inline-block text-[9px] text-[#00e56b] uppercase bg-[#0f2318] px-1.5 rounded-md border border-[#1c3e1e] mt-0.5">
                      {player.position}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <span className="text-[8.5px] text-[#5a8a6a] block uppercase font-mono">AI RATING</span>
                    <span className="text-xs font-bold text-[#f5c518] font-mono">{computeAiScore(player)}</span>
                  </div>
                  <div className="flex space-x-1.5">
                    <button
                      id={`shortlist_view_${player.userId}`}
                      onClick={() => onOpenPlayerProfile(player.userId)}
                      className="p-1 px-2.5 bg-[#0a1a0f] border border-[#1a3825] hover:border-[#00e56b]/50 text-white rounded text-[10px] uppercase font-bold tracking-wider"
                    >
                      View
                    </button>
                    <button
                      id={`shortlist_remove_${player.userId}`}
                      onClick={() => toggleShortlist(player.userId)}
                      className="p-1.5 bg-[#050e08] hover:bg-[#ff4444]/15 hover:text-[#ff4444] rounded text-[#5a8a6a] border border-[#1a3825] transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* VIRTUAL TRIAL APPLICANTS */}
      {currentUser?.role === "club" && (
        <div className="bg-[#0a1a0f] border border-[#1a3825] p-5 rounded-2xl space-y-4">
          <h3 className="text-lg font-extrabold font-bebas tracking-wide text-white uppercase flex items-center space-x-2">
            <Zap className="w-5 h-5 text-[#f5c518]" />
            <span>🔭 Virtual Trial Applicants ({myTrialApplications.length})</span>
          </h3>

          {myTrialEvents.length === 0 ? (
            <p className="text-xs text-[#5a8a6a] italic text-center py-4">No active trial events. Post a Virtual Trial Challenge to attract applicants.</p>
          ) : myTrialApplications.length === 0 ? (
            <div className="text-center p-6 bg-[#050e08]/60 border border-[#1a3825] rounded-xl space-y-2">
              <p className="text-xs text-[#5a8a6a] italic">No applications yet for your active trial events.</p>
              {myTrialEvents.map(e => (
                <div key={e.trialEventId} className="inline-flex items-center space-x-1.5 px-3 py-1 bg-[#f5c518]/10 border border-[#f5c518]/30 rounded-full">
                  <span className="text-[9px] font-black text-[#f5c518] uppercase tracking-widest">🔭 {e.drillName} — {e.clubName}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {myTrialApplications.map((app) => {
                const player = users.find(u => u.userId === app.playerId);
                return (
                  <div
                    key={app.applicationId}
                    className="bg-[#050e08]/90 p-3.5 rounded-xl border border-[#1a3825] flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{getStoryEmoji(app.playerName)}</span>
                      <div>
                        <h4 className="text-white text-xs font-bold">{app.playerName}</h4>
                        <span className="text-[9px] text-[#5a8a6a] font-mono uppercase">{app.drillName}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <span className="text-[8.5px] text-[#5a8a6a] block uppercase font-mono">Score</span>
                        <span className="text-sm font-black text-[#f5c518] font-mono">{app.score}<span className="text-[9px] text-[#5a8a6a]">/100</span></span>
                      </div>
                      {player && (
                        <button
                          onClick={() => onOpenPlayerProfile(player.userId)}
                          className="px-2.5 py-1 bg-[#0a1a0f] border border-[#f5c518]/40 hover:border-[#f5c518] text-[#f5c518] rounded text-[10px] uppercase font-bold tracking-wider transition"
                        >
                          View
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. SUBSCRIPTION TIER DISPLAY */}
      <div className="bg-[#0a1a0f] border border-[#2e5d7a]/50 p-5 rounded-2xl space-y-4 border-l-4 border-l-[#4da6ff]">
        <div className="flex justify-between items-center bg-[#050e08]/40 p-3 rounded-xl border border-[#1a3825]">
          <span className="text-xs font-bold text-[#5a8a6a] uppercase">Active Tier:</span>
          <span className="text-xs font-black text-[#4da6ff] uppercase tracking-widest font-mono">
            🛡️ KASI PREMIER CLUB SPECIAL
          </span>
        </div>

        <ul className="text-xs text-[#5a8a6a] space-y-2 font-medium">
          <li className="flex items-center space-x-2 text-[#e8f5ee]">
            <CheckCircle className="w-4 h-4 text-[#00e56b] shrink-0" />
            <span>High-frequency AI Neural Scout generates (Unlimited)</span>
          </li>
          <li className="flex items-center space-x-2 text-[#e8f5ee]">
            <CheckCircle className="w-4 h-4 text-[#00e56b] shrink-0" />
            <span>Direct contact portal with players and parents</span>
          </li>
          <li className="flex items-center space-x-2 text-[#e8f5ee]">
            <CheckCircle className="w-4 h-4 text-[#00e56b] shrink-0" />
            <span>Protected trial alignments with solidarity contracts</span>
          </li>
        </ul>

        <button 
          id="upgrade_subscription_btn"
          onClick={() => showToast("You're on a free Professional VIP Club trial ✦", "info")}
          className="w-full py-3 bg-[#4da6ff] text-[#050e08] text-xs font-bold uppercase tracking-wider rounded-xl hover:brightness-105"
        >
          Check Subscription Plan
        </button>
      </div>

    </div>
  );
};
