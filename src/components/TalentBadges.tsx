import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { motion, AnimatePresence } from "motion/react";
import { Plus, X, Check } from "lucide-react";

interface TalentBadgesProps {
  playerId: string;
}

export interface BadgeDefinition {
  badgeName: string;
  emoji: string;
  desc: string;
  borderColour: string;
}

const AVAILABLE_BADGES: BadgeDefinition[] = [
  { badgeName: "Pace Monster", emoji: "⚡", desc: "Exceptional speed and acceleration", borderColour: "#00e56b" },
  { badgeName: "Clinical Finisher", emoji: "🎯", desc: "Deadly in front of goal, converts chances", borderColour: "#f5c518" },
  { badgeName: "Vision King", emoji: "👁", desc: "Sees passes others cannot, exceptional awareness", borderColour: "#4da6ff" },
  { badgeName: "Wall", emoji: "🧱", desc: "Impossible to get past in defence", borderColour: "#8B4513" },
  { badgeName: "Engine", emoji: "⚙️", desc: "Covers every blade of grass, never stops running", borderColour: "#00e56b" },
  { badgeName: "Game Changer", emoji: "🌟", desc: "Changes the match the moment they touch the ball", borderColour: "#f5c518" },
  { badgeName: "Leader", emoji: "📣", desc: "Commands the team, vocal and motivating on the pitch", borderColour: "#4da6ff" },
  { badgeName: "Silky", emoji: "🪄", desc: "Technically gifted, elegant on the ball", borderColour: "#00e56b" },
  { badgeName: "Aerial Beast", emoji: "✈️", desc: "Dominates in the air, wins every header", borderColour: "#8B4513" },
  { badgeName: "Street Footballer", emoji: "🏘️", desc: "Raw, unpredictable, impossible to coach out — pure Kasi", borderColour: "#f5c518" },
  { badgeName: "Safe Hands", emoji: "🧤", desc: "Goalkeeper with exceptional reflexes and command", borderColour: "#4da6ff" },
  { badgeName: "One to Watch", emoji: "🔭", desc: "The community believes this player has a big future", borderColour: "#f5c518" }
];

export const TalentBadges: React.FC<TalentBadgesProps> = ({ playerId }) => {
  const { currentUser, users, ratings, awardTalentBadge } = useApp();
  const [modalOpen, setModalOpen] = useState(false);

  // Find player details
  const player = users.find(u => u.userId === playerId);
  if (!player) return null;

  const playerBadges = player.talentBadges || [];

  // Determine permissions
  const isOwnProfile = currentUser?.userId === playerId;
  const isScoutOrClub = currentUser?.role === "scout" || currentUser?.role === "club";
  const canAward = currentUser && !isOwnProfile && !isScoutOrClub;

  // Find current user's awarded badges for this player
  const myRatingDoc = ratings.find(
    r => r.fanId === currentUser?.userId && r.playerId === playerId
  );
  const myAwardedBadges = myRatingDoc ? myRatingDoc.awardedBadges : [];

  const handleSelectBadge = async (badge: BadgeDefinition) => {
    if (!canAward) return;
    if (myAwardedBadges.includes(badge.badgeName)) return;

    await awardTalentBadge(playerId, badge.badgeName, badge.emoji, badge.borderColour);
    setModalOpen(false);
  };

  return (
    <div id={`talent_badges_section_${playerId}`} className="space-y-3 font-sans">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono tracking-widest text-[#00e56b] font-extrabold uppercase select-none">
          🎖 TALENT BADGES
        </span>
        <span className="text-[9px] text-[#5a8a6a] font-mono bg-[#050e08]/90 border border-[#1a3825]/45 px-2 py-0.5 rounded uppercase">
          COMMUNITY AWARDED
        </span>
      </div>

      <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1">
        {playerBadges.length === 0 ? (
          <div className="text-xs text-[#5a8a6a] italic py-1.5 px-3 bg-[#0a1a0f]/45 border border-[#1a3825]/30 rounded-xl flex-1 text-center">
            No talent badges awarded yet. Be the first to tag them!
          </div>
        ) : (
          playerBadges.map((badge, index) => {
            const userHasAwarded = myAwardedBadges.includes(badge.badgeName);
            return (
              <motion.div
                key={badge.badgeName}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20, delay: index * 0.05 }}
                className="flex items-center space-x-1.5 shrink-0 bg-[#0a1a0f] border rounded-full px-3 py-1 text-xs select-none hover:brightness-110 transition cursor-default text-white"
                style={{ borderColor: badge.borderColour }}
              >
                <span>{badge.emoji}</span>
                <span className="font-bold tracking-tight text-[11px] whitespace-nowrap">
                  {badge.badgeName}
                </span>
                <span className="text-[#5a8a6a] font-mono text-[10px] bg-[#050e08] h-4.5 min-w-4.5 rounded-full flex items-center justify-center font-bold px-1 select-none">
                  {badge.count}
                </span>
                {userHasAwarded && (
                  <span className="h-4.5 w-4.5 rounded-full bg-[#00e56b]/20 flex items-center justify-center border border-[#00e56b]/40">
                    <Check size={8} className="text-[#00e56b]" />
                  </span>
                )}
              </motion.div>
            );
          })
        )}

        {/* Plus / Add Badge Pill Trigger */}
        {canAward && (
          <motion.button
            id="add_badge_trigger"
            onClick={() => setModalOpen(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center space-x-1 shrink-0 bg-[#0a1a0f] border border-[#1a3825] border-dashed hover:border-[#00e56b] hover:text-[#00e56b] text-[#5a8a6a] rounded-full px-3 py-1 text-xs font-bold transition duration-150 cursor-pointer select-none"
          >
            <Plus size={12} />
            <span className="text-[11px] tracking-tight">Add Badge</span>
          </motion.button>
        )}
      </div>

      {/* Badge Picker Overlay Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050e08]/95 overflow-y-auto px-4 py-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-[#0a1a0f] border border-[#1a3825] rounded-3xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] shadow-[0_0_50px_rgba(0,0,0,0.85)]"
            >
              {/* Header row */}
              <div className="p-5 border-b border-[#1a3825]/40 flex items-center justify-between bg-[#112618]/10">
                <div className="space-y-0.5">
                  <h3 className="font-bebas text-3xl font-black text-white tracking-wider uppercase">
                    Award a Talent Badge
                  </h3>
                  <p className="text-[11.5px] text-[#5a8a6a]">
                    Choose what makes this player special
                  </p>
                </div>
                <button
                  id="close_badge_modal"
                  onClick={() => setModalOpen(false)}
                  className="p-1 px-1.5 h-8 w-8 rounded-full bg-[#050e08] hover:bg-[#ff4444]/20 text-[#5a8a6a] hover:text-[#ff4444] border border-[#1a3825] flex items-center justify-center transition"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Grid listing */}
              <div className="p-5 overflow-y-auto no-scrollbar flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {AVAILABLE_BADGES.map(badge => {
                    const alreadyAwarded = myAwardedBadges.includes(badge.badgeName);
                    return (
                      <button
                        key={badge.badgeName}
                        id={`badge_picker_${badge.badgeName.toLowerCase().replace(/ /g, "_")}`}
                        disabled={alreadyAwarded}
                        onClick={() => handleSelectBadge(badge)}
                        className={`text-left p-3.5 rounded-2xl border transition duration-180 flex flex-col justify-between h-[120px] select-none ${
                          alreadyAwarded
                            ? "bg-[#102316]/30 border-[#00e56b]/20 text-white/40 cursor-not-allowed opacity-50"
                            : "bg-[#0a1a0f] border-[#1a3825]/45 hover:border-white/50 text-[#e8f5ee]"
                        }`}
                        style={!alreadyAwarded ? { borderColor: badge.borderColour + "40" } : undefined}
                      >
                        <div className="flex items-start justify-between w-full">
                          <span className="text-2xl">{badge.emoji}</span>
                          {alreadyAwarded && (
                            <span className="bg-[#00e56b] p-0.5 rounded-full flex items-center justify-center">
                              <Check size={8} className="text-[#050e08] font-bold" />
                            </span>
                          )}
                        </div>
                        
                        <div className="space-y-0.5 mt-2">
                          <h4 className="font-extrabold text-[12px] uppercase tracking-wide leading-tight font-sans">
                            {badge.badgeName}
                          </h4>
                          <p className="text-[10px] text-[#5a8a6a] leading-tight font-light line-clamp-2">
                            {badge.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
