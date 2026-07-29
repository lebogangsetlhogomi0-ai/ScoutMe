import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { motion, AnimatePresence } from "motion/react";
import { Star } from "lucide-react";

interface CommunityRatingProps {
  playerId: string;
  isCompact?: boolean;
  onCompactTap?: () => void;
}

export const CommunityRating: React.FC<CommunityRatingProps> = ({
  playerId,
  isCompact = false,
  onCompactTap
}) => {
  const { currentUser, users, ratings, submitRating } = useApp();
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animatedStarCount, setAnimatedStarCount] = useState(0);
  const [showToast, setShowToast] = useState(false);

  // Find player details
  const player = users.find(u => u.userId === playerId);
  if (!player) return null;

  const communityRating = player.communityRating || 0;
  const totalRatings = player.totalRatings || 0;

  // Find current user's rating for this player
  const myRatingDoc = ratings.find(
    r => r.fanId === currentUser?.userId && r.playerId === playerId
  );
  const myRating = myRatingDoc ? myRatingDoc.starRating : null;

  // Determine permissions
  const isOwnProfile = currentUser?.userId === playerId;
  const isScoutOrClub = currentUser?.role === "scout" || currentUser?.role === "club";
  
  // Can rate if standard Fan or Player role, NOT rating own profile, and can re-rate if needed
  const canRate =
    currentUser &&
    !isOwnProfile &&
    !isScoutOrClub;

  // Click/Submit handler
  const handleStarClick = async (ratingVal: number) => {
    if (!canRate) return;
    
    setIsAnimating(true);
    setAnimatedStarCount(0);

    // Trigger sequential fill animation
    for (let i = 1; i <= ratingVal; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      setAnimatedStarCount(i);
    }

    await submitRating(playerId, ratingVal);
    setIsAnimating(false);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  // Render Compact row (Location 1: Feed Cards)
  if (isCompact) {
    const badgeCount = player.talentBadges?.reduce((sum, b) => sum + b.count, 0) || 0;
    const topBadge = player.talentBadges && player.talentBadges.length > 0 ? player.talentBadges[0] : null;

    // Standard Star Renderer for Compact Display
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      const active = i <= Math.round(communityRating);
      stars.push(
        <span
          key={i}
          className={`${active ? "text-[#f5c518]" : "text-[#102316]"} text-xs transition duration-150`}
        >
          ★
        </span>
      );
    }

    return (
      <div
        id={`compact_rating_${playerId}`}
        onClick={onCompactTap}
        className="flex items-center space-x-2 bg-[#0a1a0f]/45 hover:bg-[#102a18]/60 border border-[#1a3825]/40 p-2.5 rounded-xl transition duration-155 cursor-pointer select-none"
      >
        <div className="flex items-center space-x-1 shrink-0">{stars}</div>
        <span className="text-white text-[11px] font-bold font-mono">
          {communityRating > 0 ? communityRating.toFixed(1) : "0.0"}
        </span>
        <span className="text-[#5a8a6a] text-[10.5px]">·</span>
        {topBadge ? (
          <div className="flex items-center space-x-1.5 text-[10.5px] text-[#e8f5ee]/90 truncate">
            <span className="shrink-0">{topBadge.emoji}</span>
            <span className="font-semibold truncate">{topBadge.badgeName}</span>
            {badgeCount > topBadge.count && (
              <span className="text-[#5a8a6a] text-[9.5px] font-mono whitespace-nowrap">
                +{badgeCount - topBadge.count} more
              </span>
            )}
          </div>
        ) : (
          <span className="text-[#5a8a6a] text-[10.5px] font-light">
            No community badges yet
          </span>
        )}
      </div>
    );
  }

  // Helper to render stars in interactive/display modes
  const renderStars = () => {
    const stars = [];
    const activeVal = isAnimating ? animatedStarCount : (hoverRating !== null ? hoverRating : (myRating !== null ? myRating : Math.round(communityRating)));

    for (let i = 1; i <= 5; i++) {
      const isFilled = i <= activeVal;
      const hasMyVoteUnderline = myRating !== null && myRating === i;

      stars.push(
        <div key={i} className="flex flex-col items-center relative">
          <motion.button
            id={`star_btn_${playerId}_${i}`}
            type="button"
            disabled={!canRate || isAnimating}
            onMouseEnter={() => canRate && setHoverRating(i)}
            onMouseLeave={() => canRate && setHoverRating(null)}
            onClick={() => handleStarClick(i)}
            whileHover={canRate ? { scale: 1.25 } : {}}
            whileTap={canRate ? { scale: 0.9 } : {}}
            animate={isAnimating && i <= animatedStarCount ? { scale: [1, 1.35, 1] } : { scale: 1 }}
            transition={{ duration: 0.2 }}
            className={`p-1 select-none focus:outline-none ${canRate ? "cursor-pointer" : "cursor-default"}`}
          >
            <Star
              size={canRate ? 28 : 20}
              className={`${
                isFilled
                  ? "text-[#f5c518] fill-[#f5c518]"
                  : "text-[#1a3020] hover:text-[#f5c518]/40"
              } transition-colors duration-150`}
            />
          </motion.button>
          
          {/* Subtle green underline indicator for self-submitted stars */}
          {hasMyVoteUnderline && (
            <div className="absolute -bottom-1 w-2.5 h-0.5 bg-[#00e56b] rounded-full" />
          )}
        </div>
      );
    }
    return <div className="flex items-center space-x-2.5">{stars}</div>;
  };

  return (
    <div 
      id={`community_rating_box_${playerId}`}
      className="bg-[#0a1a0f] border border-[#1a3825]/60 hover:border-[#1a3825] p-4.5 rounded-2xl relative overflow-hidden transition"
    >
      {canRate ? (
        <div className="space-y-3 font-sans">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono tracking-widest text-[#00e56b] font-extrabold uppercase select-none">
              ✦ COMMUNITY RATING
            </span>
            <span className="text-[9.5px] text-[#5a8a6a] font-mono bg-[#050e08] border border-[#1a3825]/45 px-2 py-0.5 rounded">
              PENDING VOTE
            </span>
          </div>
          
          <p className="text-xs text-[#5a8a6a]/90 leading-relaxed font-sans">
            Submit your community vote on this grassroots athlete. Rate their current talent level on a 5-star scale.
          </p>

          <div className="flex flex-col items-center justify-center p-3.5 bg-[#050e08]/50 border border-[#1a3825]/30 rounded-xl space-y-2">
            <span className="text-[10.5px] uppercase font-bold tracking-wider text-[#00e56b]/85">
              Rate this player
            </span>
            {renderStars()}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-4 font-sans">
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono tracking-widest text-[#5a8a6a] font-extrabold uppercase select-none">
                ✦ COMMUNITY RATING
              </span>
              {myRating !== null && (
                <span className="bg-[#00e56b]/15 text-[#00e56b] border border-[#00e56b]/35 text-[8.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded font-mono">
                  YOU VOTED {myRating} ★
                </span>
              )}
            </div>

            <p className="text-xs text-[#5a8a6a]/90 leading-relaxed">
              {isOwnProfile
                ? "This is your Community Score based on feedback from fans and players."
                : isScoutOrClub
                ? "Scout Intel mode. Rating displays are read-only to preserve neutral scouting."
                : "Your community vote has been registered. Rating can be updated anytime."}
            </p>

            <span className="block text-[10.5px] text-[#5a8a6a]/65 font-mono pt-1">
              Based on {totalRatings.toLocaleString()} community submissions
            </span>
          </div>

          <div className="flex flex-col items-center justify-center shrink-0 bg-[#050e08] border border-[#1a3825]/55 p-3.5 rounded-2xl min-w-[100px] text-center select-none shadow">
            {renderStars()}
            <span className="text-white text-2xl font-black font-mono mt-2 tracking-tighter">
              {communityRating > 0 ? communityRating.toFixed(1) : "0.0"}
            </span>
            <span className="text-[9px] uppercase text-[#5a8a6a] font-mono mt-0.5 tracking-wider">
              Avg Rating
            </span>
          </div>
        </div>
      )}

      {/* Slide Up Floating Toast overlay for interactive feedback */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 40, x: "-50%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#00e56b] border border-[#00c55b] text-[#050e08] text-xs font-extrabold uppercase tracking-widest px-6 py-3 rounded-full shadow-2xl z-50 flex items-center space-x-2"
          >
            <span>Rating submitted</span>
            <span className="text-sm">✦</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
