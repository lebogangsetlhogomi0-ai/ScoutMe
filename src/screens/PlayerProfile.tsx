import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { useToast } from "../components/Toast";
import { UserProfile, PostHighlight } from "../types";
import { ArrowLeft, Share2, Award, CheckCircle2, Shield, PlayCircle, Star, Zap } from "lucide-react";
import { CommunityRating } from "../components/CommunityRating";
import { TalentBadges } from "../components/TalentBadges";
import { motion } from "motion/react";
import { POSITION_BENCHMARKS, calculateRanking, getOverallRanking } from "../utils/benchmark";
import { generateAndShareReportCard } from "../utils/shareReport";
import { computeAiScore } from "../utils/aiScore";
import { FollowListModal } from "../components/FollowListModal";

interface PlayerProfileProps {
  playerId: string;
  onBack: () => void;
  onTriggerScoutAI: (playerId: string) => void;
  onOpenClubProfile?: (clubId: string) => void;
}

export const PlayerProfile: React.FC<PlayerProfileProps> = ({ playerId, onBack, onTriggerScoutAI, onOpenClubProfile }) => {
  const { users, currentUser, posts, toggleShortlist, shortlist, toggleFollow, updateBio, addSystemNotification } = useApp();
  const { showToast } = useToast();
  const [showTrialConfirmModal, setShowTrialConfirmModal] = useState(false);
  const [selectedGridTab, setSelectedGridTab] = useState<string>("HIGHLIGHTS");
  const [animateProgress, setAnimateProgress] = useState(false);
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);

  // Trigger progress animations on mount; reset grid tab when switching profiles
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimateProgress(true);
    }, 150);
    setSelectedGridTab(player?.role === "platform" ? "P.O.T.W" : "HIGHLIGHTS");
    return () => clearTimeout(timer);
  }, [playerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Notify player when a scout or club views their profile
  useEffect(() => {
    if (!currentUser || !playerId || currentUser.userId === playerId) return;
    if (currentUser.role !== "scout" && currentUser.role !== "club") return;
    const rateLimitKey = `scout_view_${currentUser.userId}_${playerId}`;
    const lastSent = parseInt(localStorage.getItem(rateLimitKey) || "0");
    if (Date.now() - lastSent < 3600000) return;
    localStorage.setItem(rateLimitKey, String(Date.now()));
    const orgLabel = currentUser.organisation || currentUser.clubName || "an independent scout";
    addSystemNotification(
      playerId,
      `👀 A verified scout from ${orgLabel} just viewed your profile. Keep uploading to stay visible! 🔥`
    );
  }, [playerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Find targeted player
  const player = users.find(u => u.userId === playerId);

  const [followModal, setFollowModal] = useState<"followers" | "following" | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(player?.name || "");
  const [editAge, setEditAge] = useState(player?.age || 18);
  const [editPosition, setEditPosition] = useState(player?.position || "CAM");
  const [editClub, setEditClub] = useState(player?.club || "Unattached");
  const [editProvince, setEditProvince] = useState(player?.province || "Gauteng");
  const [editBio, setEditBio] = useState(player?.bio || "");
  const [editPace, setEditPace] = useState(player?.pace || 82);
  const [editVision, setEditVision] = useState(player?.vision || 82);
  const [editFinishing, setEditFinishing] = useState(player?.finishing || 82);

  const handleOpenEdit = () => {
    if (!player) return;
    setEditName(player.name);
    setEditAge(player.age || 18);
    setEditPosition(player.position || "CAM");
    setEditClub(player.club || "Unattached");
    setEditProvince(player.province || "Gauteng");
    setEditBio(player.bio || "");
    setEditPace(player.pace || 82);
    setEditVision(player.vision || 82);
    setEditFinishing(player.finishing || 82);
    setIsEditing(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    updateBio(editBio, {
      name: editName,
      age: Number(editAge),
      position: editPosition,
      club: editClub,
      province: editProvince,
      pace: Number(editPace),
      vision: Number(editVision),
      finishing: Number(editFinishing),
      rating: Math.round((Number(editPace) + Number(editVision) + Number(editFinishing)) / 3)
    });
    setIsEditing(false);
  };

  if (!player) {
    return (
      <div className="flex-1 p-6 text-center space-y-4">
        <p className="text-sm text-[#ff4444]">Player profile not found code {playerId}.</p>
        <button onClick={onBack} className="text-white underline">Back and retry</button>
      </div>
    );
  }

  // Filter posts by this profile's userId
  const playerPosts = posts.filter(p => p.userId === player.userId);

  // Grid tabs differ by role
  const isPlatformProfile = player.role === "platform";
  const PLATFORM_TABS = [
    { key: "P.O.T.W",     label: "P.O.T.W",     full: "Player of the Week", types: ["player_of_week"] },
    { key: "SIGNING",     label: "SIGNING",      full: "Signing Announcements", types: ["signing"] },
    { key: "MOST IMP.",   label: "MOST IMP.",    full: "Most Improved", types: ["most_improved"] },
    { key: "CHALLENGE",   label: "CHALLENGE",    full: "Virtual Trial Challenge", types: ["trial_challenge"] },
    { key: "UPDATE",      label: "UPDATE",       full: "Platform Update", types: ["platform_update"] },
  ] as const;

  const PLAYER_TABS = [
    { key: "HIGHLIGHTS",  label: "HIGHLIGHTS",  full: "Highlights",  types: ["highlight"] },
    { key: "MATCH CLIPS", label: "MATCH CLIPS",  full: "Match Clips", types: ["match", "full"] },
    { key: "TRAINING",    label: "TRAINING",    full: "Training",    types: ["training"] },
  ] as const;

  const gridTabs = isPlatformProfile ? PLATFORM_TABS : PLAYER_TABS;
  type GridTabKey = (typeof gridTabs)[number]["key"];

  const activeTab = gridTabs.find(t => t.key === selectedGridTab) ?? gridTabs[0];

  const filteredGridPosts = playerPosts.filter(p =>
    (activeTab.types as readonly string[]).includes(p.contentType || "")
  );

  const isOwnProfile = currentUser?.userId === player.userId;
  const isPlayerShortlisted = shortlist.includes(player.userId);

  const getRoleColor = (role?: string) => {
    switch (role) {
      case "player": return "#00e56b";
      case "scout": return "#f5c518";
      case "club": return "#4da6ff";
      default: return "#00e56b";
    }
  };

  const getRoleBorderColorClass = (role?: string) => {
    switch (role) {
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

  const isFollowing = player.followers?.includes(currentUser?.userId || "") || false;

  // Scouts/clubs use trial+shortlist only for actual players, not for Official or fan accounts
  const viewingPlayerAccount = player.role === "player";

  const handleActionClick = () => {
    if ((currentUser?.role === "scout" || currentUser?.role === "club") && viewingPlayerAccount) {
      const willAdd = !shortlist.includes(player.userId);
      toggleShortlist(player.userId);
      showToast(willAdd ? "Added to shortlist ✦" : "Removed from shortlist ✦", willAdd ? "success" : "info");
    } else {
      const willFollow = !isFollowing;
      toggleFollow(player.userId);
      showToast(willFollow ? `Following ${player.name} ✦` : `Unfollowed ${player.name}`, willFollow ? "success" : "info");
    }
  };

  const activeColor = getRoleColor(currentUser?.role);

  return (
    <div className="flex-1 pb-24 overflow-y-auto w-full no-scrollbar px-3 space-y-6">
      
      {/* 1. HEADER ROW */}
      <div className="flex items-center justify-between border-b border-[#1a3825]/40 pb-3 bg-[#050e08]/90 sticky top-0 z-10 py-1">
        <button 
          id="profile_back_btn"
          onClick={onBack} 
          className="p-1 text-[#5a8a6a] hover:text-[#00e56b]"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <span className="text-md font-bebas font-extrabold text-white tracking-widest uppercase truncate max-w-[200px]">
          {player.name}
        </span>
        <button 
          id="profile_share_btn"
          onClick={() => {
            navigator.clipboard.writeText(`https://scoutme.org/player/${player.userId}`).catch(() => {});
            showToast("Footage link copied ✦", "success");
          }}
          className="p-1 text-[#5a8a6a] hover:text-[#00e56b]"
        >
          <Share2 className="w-5.5 h-5.5" />
        </button>
      </div>

      {/* 2. PROFILE HEADER (Instagram Profile Style) */}
      <div className="space-y-4">
        
        {/* Row 1: Avatar circle and stats */}
        <div className="flex items-center justify-between">
          <div className={`w-[80px] h-[80px] rounded-full bg-[#0a1a0f] border-3 flex items-center justify-center text-5xl relative ${getRoleBorderColorClass(currentUser?.role)}`}>
            {getStoryEmoji(player.name)}
          </div>

          <div className="flex-1 flex justify-around ml-4 bg-[#0a1a0f] border border-[#1a3825] py-2 px-3 rounded-2xl">
            {viewingPlayerAccount ? (
              <>
                <div className="text-center">
                  <span className="block text-sm font-bold text-white font-mono">
                    {(player.views || 0).toLocaleString()}
                  </span>
                  <span className="text-[9.5px] uppercase text-[#5a8a6a] tracking-tight">Views</span>
                </div>
                <div className="text-center border-x border-[#1a3825]/60 px-4">
                  <span className="block text-sm font-bold text-white font-mono">
                    {(player.votes || 0).toLocaleString()}
                  </span>
                  <span className="text-[9.5px] uppercase text-[#5a8a6a] tracking-tight">Votes</span>
                </div>
                <div className="text-center">
                  <span className="block text-sm font-extrabold text-[#00e56b] font-mono">
                    {computeAiScore(player)}
                  </span>
                  <span className="text-[9.5px] uppercase text-[#5a8a6a] tracking-tight">AI Score</span>
                </div>
              </>
            ) : (
              <>
                <div className="text-center">
                  <span className="block text-sm font-bold text-[#00e56b] font-mono">
                    {(player.followers || []).length}
                  </span>
                  <span className="text-[9.5px] uppercase text-[#5a8a6a] tracking-tight">Followers</span>
                </div>
                <div className="text-center border-x border-[#1a3825]/60 px-4">
                  <span className="block text-sm font-bold text-white font-mono">
                    {(player.following || []).length}
                  </span>
                  <span className="text-[9.5px] uppercase text-[#5a8a6a] tracking-tight">Following</span>
                </div>
                <div className="text-center">
                  <span className="block text-sm font-extrabold text-white font-mono uppercase text-[9px]">
                    {player.role === "platform" ? "Official" : player.role}
                  </span>
                  <span className="text-[9.5px] uppercase text-[#5a8a6a] tracking-tight">Account</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Row 1.5: Dynamic Followers & Following stats block */}
        <div id={`stats_follows_bar_${player.userId}`} className="flex items-center justify-around bg-[#0a1a0f] border border-[#1a3825] py-2.5 px-3 rounded-2xl font-mono mt-1 select-none">
          <button className="text-center flex-1 active:opacity-70 transition" onClick={() => setFollowModal("followers")}>
            <span className="block text-sm font-extrabold text-[#00e56b]">
              {(player.followers || []).length}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-[#5a8a6a] font-sans font-medium">Followers</span>
          </button>
          <div className="w-px h-6 bg-[#1a3825]/60" />
          <button className="text-center flex-1 active:opacity-70 transition" onClick={() => setFollowModal("following")}>
            <span className="block text-sm font-extrabold text-white">
              {(player.following || []).length}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-[#5a8a6a] font-sans font-medium">Following</span>
          </button>
        </div>

        {followModal && (
          <FollowListModal
            title={followModal === "followers" ? `${player.name.split(" ")[0]}'s Followers` : `${player.name.split(" ")[0]} is Following`}
            userIds={followModal === "followers" ? (player.followers || []) : (player.following || [])}
            allUsers={users}
            onClose={() => setFollowModal(null)}
            onViewProfile={(uid) => { setFollowModal(null); onBack(); }}
          />
        )}

        {/* Row 2: Player Headline */}
        <div className="space-y-1">
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <h3 className="text-2xl font-extrabold text-[#e8f5ee] font-bebas tracking-wide shadow-md">
              {player.name}
            </h3>
            {player.endorsed && (
              <span className="bg-[#f5c518] text-[#050e08] p-0.5 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-[#050e08] fill-current" />
              </span>
            )}
            {player.virtualTrial && (
              <span 
                className="bg-[#00e56b] text-[#050e08] px-1.5 py-0.5 rounded text-[8.5px] font-black tracking-widest uppercase flex items-center space-x-1 shadow-md"
                title="Virtual Trial Completed"
              >
                <Zap className="w-2.5 h-2.5 fill-current animate-pulse" />
                <span>VIRTUAL TRIAL</span>
              </span>
            )}
          </div>

          {/* Row 3 Position pill and core data */}
          <div className="flex items-center space-x-2.5 text-xs text-[#5a8a6a]">
            <span className="px-2 py-0.5 rounded font-bold uppercase text-[10px] bg-[#0f2318] text-[#00e56b] border border-[#1a3825]">
              {player.position}
            </span>
            <span className="bg-[#0f2318] border border-[#1a3825] px-2 py-0.5 rounded hover:text-white transition">Age {player.age}</span>
            {(() => {
              const matchedClub = users.find(u => u.role === "club" && (
                u.clubName?.toLowerCase() === player.club?.toLowerCase() ||
                u.name?.toLowerCase() === player.club?.toLowerCase()
              ));
              if (matchedClub) {
                return (
                  <button 
                    onClick={() => {
                      if (onOpenClubProfile) {
                        onOpenClubProfile(matchedClub.userId);
                      } else {
                        showToast(`Club timeline loading for ${matchedClub.clubName || matchedClub.name}`, "info");
                      }
                    }}
                    className="bg-[#0f2318] border border-[#4da6ff]/40 text-[#4da6ff] px-2 py-0.5 rounded uppercase hover:bg-[#4da6ff]/10 hover:text-white transition font-mono font-bold flex items-center space-x-1"
                  >
                    <span>🛡️</span>
                    <span>{player.club || "Unattached"}</span>
                  </button>
                );
              }
              return (
                <span className="bg-[#0f2318] border border-[#1a3825] px-2 py-0.5 rounded uppercase">{player.club || "Unattached"}</span>
              );
            })()}
          </div>

          {/* Row 4 Province */}
          <div className="text-xs text-[#5a8a6a]">
            📍 {player.province} · South Africa Grassroots Circuit
          </div>
        </div>

        {/* Row 5 Biography details */}
        <p className="text-xs text-[#e8f5ee]/85 leading-relaxed font-sans mt-2 italic bg-[#0f2318]/50 p-2.5 rounded-xl border border-[#1a3825]/30">
          " {player.bio || "Dedicated grassroots South African player looking for professional trials."} "
        </p>

        {/* Row 6 Hashtags and skills badges */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <span className="text-[9.5px] font-mono bg-[#1a3020] text-[#00e56b] px-2 py-0.5 rounded-full uppercase">#ScoutMe</span>
          <span className="text-[9.5px] font-mono bg-[#1a3020] text-[#00e56b] px-2 py-0.5 rounded-full">#KasiFootball</span>
          <span className="text-[9.5px] font-mono bg-[#1a3020] text-[#00e56b] px-2 py-0.5 rounded-full">#AthleteDiscovery</span>
        </div>

        {/* Row 7 Action buttons full width */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          {isOwnProfile ? (
            <>
              <button 
                id="own_profile_edit"
                onClick={handleOpenEdit}
                className="py-3 bg-[#0a1a0f] border border-[#1a3825] hover:border-[#00e56b] hover:text-[#00e56b] transition text-white rounded-xl text-xs font-bold uppercase tracking-wider"
              >
                Edit Profile
              </button>
              <button 
                onClick={() => {
                  const shareUrl = `https://scoutme.org/player/${player.userId}`;
                  navigator.clipboard.writeText(shareUrl).catch(() => {});
                  showToast("Profile link copied ✦", "success");
                }}
                className="py-3 bg-[#00e56b] text-[#050e08] rounded-xl text-xs font-bold uppercase tracking-wider hover:brightness-105"
              >
                Share Profile
              </button>
            </>
          ) : ((currentUser?.role === "scout" || currentUser?.role === "club") && viewingPlayerAccount) ? (
            <>
              <button
                id="scout_trial_request"
                onClick={() => {
                  addSystemNotification(
                    player.userId,
                    `⚡ Direct Trial Proposed! Scout ${currentUser?.name || "Verified Scout"} from ${currentUser?.organisation || "Independent Scouting"} has proposed a direct trial. Open your inbox for scheduling.`
                  );
                  setShowTrialConfirmModal(true);
                }}
                className="py-3 bg-[#f5c518] text-[#050e08] rounded-xl text-xs font-extrabold uppercase tracking-widest hover:brightness-105"
              >
                Request Trial
              </button>
              <button 
                id="scout_add_shortlist"
                onClick={handleActionClick}
                className={`py-3 rounded-xl text-xs font-bold uppercase tracking-wider border transition ${isPlayerShortlisted ? "bg-[#ff4444] border-[#ff4444] text-white" : "border-[#1a3825] text-white bg-[#0a1a0f] hover:bg-[#0f2318]"}`}
              >
                {isPlayerShortlisted ? "Remove Shortlist" : "Add Shortlist"}
              </button>
            </>
          ) : (
            <>
              <button 
                id="fan_follow_toggle"
                onClick={handleActionClick}
                className={`py-3 rounded-xl text-xs font-bold uppercase tracking-wider border transition ${isFollowing ? "bg-[#0a1a0f] border-[#1a3825] text-[#5a8a6a]" : "bg-[#00e56b] border-[#00e56b] text-[#050e08] hover:brightness-105"}`}
              >
                {isFollowing ? "Following ✔" : "Follow"}
              </button>
              <button 
                onClick={() => {
                  const shareUrl = `https://scoutme.org/player/${player.userId}`;
                  navigator.clipboard.writeText(shareUrl).catch(() => {});
                  showToast(`${player.name}'s profile link copied ✦`, "success");
                }}
                className="py-3 bg-[#0a1a0f] border border-[#1a3825] text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#0f2318]"
              >
                Share
              </button>
            </>
          )}
        </div>

      </div>

      {/* 3. NEURAL SCOUT INTELLIGENCE PANEL */}
      <div className="bg-[#0a1a0f] border border-[#1a3825] rounded-2xl overflow-hidden shadow-lg border-t-4 border-t-[#00e56b]">
        {/* Header row */}
        <div className="p-4 bg-[#050e08]/60 flex justify-between items-center border-b border-[#1a3825]/40联合">
          <div className="flex items-center space-x-2">
            <span className="text-[#00e56b] text-sm">◆</span>
            <span className="text-sm font-black font-bebas tracking-wider text-white">NEURAL SCOUT INTELLIGENCE</span>
          </div>
          {(() => {
            const overallRanking = player && (player.pace && player.vision && player.finishing) ? getOverallRanking(player, player.position || "ST") : null;
            return (
              <div className="flex items-center space-x-3 text-right">
                <div>
                  <span className="text-[10px] text-[#5a8a6a] block uppercase font-mono tracking-tighter">AI AGGREGATE</span>
                  <span className="text-xl font-bold font-mono text-[#00e56b]">{computeAiScore(player!)}</span>
                </div>
                {overallRanking && (
                  <span className="px-2 py-1 rounded text-[10px] font-black uppercase" style={{ backgroundColor: `${overallRanking.color}20`, color: overallRanking.color, border: `1px solid ${overallRanking.color}40` }}>
                    {overallRanking.badge}
                  </span>
                )}
              </div>
            );
          })()}
        </div>

        {/* Dynamic Stat bar percentage controls with animated fills */}
        <div className="p-4 space-y-4">
          
          {/* Pace bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-[#5a8a6a] font-semibold">
              <span className="text-[#e8f5ee]">PACE</span>
              <span className="font-mono text-white">{player.pace || 92}%</span>
            </div>
            <div className="h-2.5 bg-[#050e08] rounded-full overflow-hidden border border-[#1a3825]/40">
              <div 
                className="h-full bg-[#00e56b] transition-all duration-1000 ease-out"
                style={{ width: animateProgress ? `${player.pace || 92}%` : "0%" }}
              />
            </div>
          </div>

          {/* Vision bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-[#5a8a6a] font-semibold">
              <span className="text-[#e8f5ee]">VISION</span>
              <span className="font-mono text-white">{player.vision || 85}%</span>
            </div>
            <div className="h-2.5 bg-[#050e08] rounded-full overflow-hidden border border-[#1a3825]/40">
              <div 
                className="h-full bg-[#f5c518] transition-all duration-1000 ease-out"
                style={{ width: animateProgress ? `${player.vision || 85}%` : "0%" }}
              />
            </div>
          </div>

          {/* Finishing bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-[#5a8a6a] font-semibold">
              <span className="text-[#e8f5ee]">FINISHING</span>
              <span className="font-mono text-white">{player?.finishing || 79}%</span>
            </div>
            <div className="h-2.5 bg-[#050e08] rounded-full overflow-hidden border border-[#1a3825]/40">
              <div 
                className="h-full bg-[#4da6ff] transition-all duration-1000 ease-out"
                style={{ width: animateProgress ? `${player?.finishing || 79}%` : "0%" }}
              />
            </div>
          </div>

          {/* COMPACT POSITION BENCHMARK */}
          {player && (() => {
            const positionKey = (player.position || "ST").toUpperCase();
            const benchmark = POSITION_BENCHMARKS[positionKey] || POSITION_BENCHMARKS["ST"];
            if (!benchmark) return null;

            const paceRank = calculateRanking(player.pace || 92, benchmark.pace);
            const visionRank = calculateRanking(player.vision || 85, benchmark.vision);
            const finishingRank = calculateRanking(player.finishing || 79, benchmark.finishing);
            const overallRank = getOverallRanking(player, positionKey);

            return (
              <div className="p-3 bg-[#050e08]/70 border border-[#1a3825]/60 rounded-xl space-y-2.5 mt-2">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="font-black tracking-[1px] text-[#f5c518] uppercase">
                    POSITION BENCHMARK ◆
                  </span>
                  <span className="text-[#5a8a6a] font-mono">
                    vs. all {positionKey}s on ScoutMe
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  {/* PACE */}
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-300">PACE ({player.pace || 92} vs avg {benchmark.pace})</span>
                    <span className="px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase text-[#050e08]" style={{ backgroundColor: paceRank.color }}>
                      {paceRank.badge}
                    </span>
                  </div>
                  {/* VISION */}
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-300">VISION ({player.vision || 85} vs avg {benchmark.vision})</span>
                    <span className="px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase text-[#050e08]" style={{ backgroundColor: visionRank.color }}>
                      {visionRank.badge}
                    </span>
                  </div>
                  {/* FINISHING */}
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-300">FINISHING ({player.finishing || 79} vs avg {benchmark.finishing})</span>
                    <span className="px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase text-[#050e08]" style={{ backgroundColor: finishingRank.color }}>
                      {finishingRank.badge}
                    </span>
                  </div>
                </div>

                {overallRank && (
                  <div className="w-full py-1 px-2 rounded text-[9.5px] font-black uppercase text-[#050e08] text-center mt-1" style={{ backgroundColor: overallRank.color }}>
                    OVERALL: {overallRank.percentile} of {benchmark.label}s
                  </div>
                )}
              </div>
            );
          })()}

          {/* Scout Analysis Text Paragraph */}
          <div className="pt-3 border-t border-[#1a3825]/40">
            <p className="text-xs text-[#5a8a6a] leading-relaxed select-text italic">
              "Based on game counter metrics and physical stats, {player?.name} is classified as a top-tier {player?.position}. They exhibit elite acceleration capabilities, with high operational soccer intelligence to transition from defensive lines directly into counter-attacking spaces. An extremely prospective talent from the {player?.province} circuit."
            </p>
          </div>

          <div className="flex items-center justify-between text-[10px] bg-[#050e08]/90 p-2.5 rounded-lg border border-[#1a3825]/80 mt-2">
            <span className="text-[#5a8a6a] uppercase">CALIBRATED CONFIDENCE LIMIT</span>
            <span className={`px-2 py-0.5 font-bold rounded ${computeAiScore(player!) > 70 ? "bg-[#00e56b]/15 text-[#00e56b] border border-[#00e56b]/30" : "bg-[#f5c518]/15 text-[#f5c518] border border-[#f5c518]/30"}`}>
              {computeAiScore(player!) > 70 ? "HIGH CONFIDENCE" : "MEDIUM CONFIDENCE"}
            </span>
          </div>

          {/* CTA Link to generate custom report */}
          {(currentUser?.role === "scout" || currentUser?.role === "club") && player && (
            <button 
              id="scout_generate_report_cta"
              onClick={() => onTriggerScoutAI(player.userId)}
              className="w-full py-3 bg-transparent border-2 border-[#f5c518] text-[#f5c518] hover:bg-[#f5c518]/10 text-xs font-bold uppercase rounded-xl transition mt-1.5"
            >
              ◆ OPEN IN NEURAL SCOUT AI ENGINE
            </button>
          )}

          {/* Share Report Button */}
          {player && (
            <button 
              id="scout_share_report_profile_btn"
              onClick={() => {
                generateAndShareReportCard(player, {
                  overallScore: computeAiScore(player),
                  paceScore: player.pace || 92,
                  visionScore: player.vision || 85,
                  finishingScore: player.finishing || 79,
                  generatedReport: `Based on game counter metrics and physical stats, ${player.name} is classified as a top-tier ${player.position}. They exhibit elite acceleration capabilities, with high operational soccer intelligence to transition from defensive lines directly into counter-attacking spaces.`
                }, setIsGeneratingCard);
              }}
              disabled={isGeneratingCard}
              className="w-full py-3 bg-[#00e56b] hover:bg-[#00c75c] disabled:opacity-50 text-[#050e08] hover:text-[#050e08] text-xs font-bold uppercase rounded-xl transition mt-2 flex items-center justify-center space-x-2"
            >
              {isGeneratingCard ? (
                <span className="animate-pulse">◆ GENERATING CARD...</span>
              ) : (
                <span>📤 SHARE REPORT CARD</span>
              )}
            </button>
          )}

        </div>
      </div>

      {/* 3.4 VIRTUAL TRIAL COMPLETED SECTION */}
      {player.virtualTrial && (
        <div className="bg-[#050e08]/90 border-2 border-dashed border-[#00e56b]/40 p-4.5 rounded-2xl space-y-4 shadow-xl">
          <div className="flex justify-between items-center border-b border-[#1a3825]/40 pb-2.5">
            <div className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-[#00e56b] animate-pulse" />
              <h3 className="text-sm font-black text-white font-sans uppercase tracking-wider">
                ⚡ VIRTUAL TRIAL COMPLETED
              </h3>
            </div>
            <span className="text-[9px] font-mono text-[#5a8a6a]">
              COMPLETED: {player.virtualTrial.completedAt}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Score box */}
            <div className="bg-[#0a1a0f] border border-[#1a3825] rounded-xl p-3.5 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-[#00e56b] font-mono">
                {player.virtualTrial.score}
              </span>
              <span className="text-[9.5px] uppercase text-[#5a8a6a] font-bold mt-1 tracking-wider text-center">
                DRILL GRADE
              </span>
            </div>

            {/* Drill Info box */}
            <div className="bg-[#0a1a0f] border border-[#1a3825] rounded-xl p-3.5 flex flex-col justify-center">
              <span className="text-xs font-bold text-white uppercase font-mono">
                {player.virtualTrial.drillName}
              </span>
              <span className="text-[9.5px] text-[#5a8a6a] mt-1.5 font-bold uppercase">
                RANK: <strong className="text-[#f5c518]">{player.virtualTrial.ranking}</strong>
              </span>
            </div>
          </div>

          {/* Expanded information */}
          <div className="space-y-3 bg-[#0a1a0f]/60 border border-[#1a3825]/50 p-3.5 rounded-xl">
            <div className="flex justify-between items-center text-[10px]">
              <span className="font-bold text-[#f5c518] uppercase tracking-wider">Position Benchmark Index</span>
              <span className="text-[#5a8a6a] font-mono">vs. Average {player.position}</span>
            </div>
            
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-[#e8f5ee]">
                <span>Pace Metric</span>
                <span>{player.virtualTrial.paceScore}/100</span>
              </div>
              <div className="flex justify-between text-[#e8f5ee]">
                <span>Vision Metric</span>
                <span>{player.virtualTrial.visionScore}/100</span>
              </div>
              <div className="flex justify-between text-[#e8f5ee]">
                <span>Finishing Metric</span>
                <span>{player.virtualTrial.finishingScore}/100</span>
              </div>
            </div>

            <p className="text-xs text-[#5a8a6a] leading-relaxed italic border-t border-[#1a3825]/40 pt-2.5">
              "{player.virtualTrial.assessment}"
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                generateAndShareReportCard(player, {
                  overallScore: player.virtualTrial?.score || 80,
                  paceScore: player.virtualTrial?.paceScore || 80,
                  visionScore: player.virtualTrial?.visionScore || 80,
                  finishingScore: player.virtualTrial?.finishingScore || 80,
                  generatedReport: player.virtualTrial?.assessment || ""
                }, setIsGeneratingCard);
              }}
              disabled={isGeneratingCard}
              className="py-2.5 bg-[#00e56b] text-[#050e08] hover:bg-[#00c75c] font-bold text-[10px] rounded-lg transition uppercase tracking-wider text-center cursor-pointer"
            >
              {isGeneratingCard ? "Sharing..." : "📤 Share Report"}
            </button>
            
            {(currentUser?.role === "scout" || currentUser?.role === "club") && (
              <button
                onClick={() => onTriggerScoutAI(player.userId)}
                className="py-2.5 bg-transparent border border-[#f5c518] text-[#f5c518] hover:bg-[#f5c518]/10 font-bold text-[10px] rounded-lg transition uppercase tracking-wider text-center cursor-pointer"
              >
                ◆ Full Scout View
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3.5 COMMUNITY INTEL SECTION (Fades in on view using motion) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.55 }}
        className="space-y-4 bg-[#0a1a0f]/20 border border-[#1a3825]/30 p-4 rounded-2xl"
      >
        <div className="flex items-center space-x-2 border-b border-[#1a3825]/30 pb-2.5">
          <Award className="w-5 h-5 text-[#00e56b]" />
          <h3 className="text-lg font-extrabold text-[#e8f5ee] font-bebas tracking-wide">
            COMMUNITY INTEL
          </h3>
        </div>
        
        <CommunityRating playerId={player.userId} />
        <TalentBadges playerId={player.userId} />
      </motion.div>

      {/* 4. SCOUT AGREEMENT DISCLOSURE ACTIVE NOTICE */}
      <div className="bg-[#231e0f] border border-[#f5c518]/50 text-[#f5c518] p-4.5 rounded-2xl flex items-start space-x-3 shadow-lg">
        <Shield className="w-5 h-5 mt-0.5 text-[#f5c518] shrink-0" />
        <div className="space-y-1">
          <h4 className="text-sm font-bold font-bebas tracking-wide uppercase">ScoutMe Agreement Active</h4>
          <p className="text-[11px] text-[#5a8a6a] leading-relaxed">
            All club negotiations, contractual alignments, or trial setups originating from ScoutMe player discovery must be declared through the platform within 24 months of first profile contact.
          </p>
        </div>
      </div>

      {/* 5. POSTS CONTENT GRID */}
      <div className="space-y-3">
        {/* Tabs — scrollable row for platform (5 tabs), fixed for players (3 tabs) */}
        <div className={`flex border-b border-[#1a3825]/50 text-[10px] font-bold ${isPlatformProfile ? "overflow-x-auto no-scrollbar" : ""}`}>
          {gridTabs.map(tab => (
            <button
              key={tab.key}
              id={`grid_tab_${tab.key}`}
              title={tab.full}
              onClick={() => setSelectedGridTab(tab.key)}
              className={`flex-shrink-0 flex-1 text-center py-3 px-2 select-none transition whitespace-nowrap ${selectedGridTab === tab.key ? "text-[#00e56b] border-b-2 border-[#00e56b] font-extrabold" : "text-[#5a8a6a] hover:text-[#e8f5ee]"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 3-column Grid Display */}
        {filteredGridPosts.length === 0 ? (
          <div className="bg-[#0a1a0f] border border-[#1a3825] rounded-xl p-8 text-center text-xs text-[#5a8a6a] italic">
            No posts under '{activeTab.full}'.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {filteredGridPosts.map(post => (
              <div 
                key={post.postId}
                onClick={() => showToast(`Opening ${post.playerName}'s clip ✦`, "info")}
                className="aspect-square bg-[#050e08] border border-[#1a3825]/45 rounded-lg relative overflow-hidden group cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <PlayCircle className="w-8 h-8 text-white/70 group-hover:text-[#00e56b] group-hover:scale-110 transition duration-300" />
                </div>
                {/* Simulated Thumbnail background */}
                <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-[10px] text-[#5a8a6a] font-mono select-none">
                  {post.thumbnailUrl}
                </div>
                {/* View count overlaid at bottom left */}
                <span className="absolute bottom-1.5 left-1.5 text-[9px] text-white/95 font-mono z-20">
                  👁 {post.views}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* EDIT PROFILE MODAL */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#050e08] border border-[#1a3825] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 my-8 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-[#1a3825]/40 pb-3">
              <h3 className="text-sm font-bold text-[#00e56b] uppercase tracking-wider font-mono">
                Edit ScoutMe Profile
              </h3>
              <button 
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-[#5a8a6a] hover:text-[#00e56b] transition font-mono text-lg p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono text-[#5a8a6a] uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input 
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#0a1a0f] border border-[#1a3825] text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#00e56b] font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-[#5a8a6a] uppercase tracking-wider mb-1">
                    Age
                  </label>
                  <input 
                    type="number"
                    required
                    min="1"
                    max="100"
                    value={editAge}
                    onChange={(e) => setEditAge(Number(e.target.value))}
                    className="w-full bg-[#0a1a0f] border border-[#1a3825] text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#00e56b] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-[#5a8a6a] uppercase tracking-wider mb-1">
                    Position
                  </label>
                  <select 
                    value={editPosition}
                    onChange={(e) => setEditPosition(e.target.value)}
                    className="w-full bg-[#0a1a0f] border border-[#1a3825] text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#00e56b] font-mono"
                  >
                    {["ST", "CF", "CAM", "RW", "LW", "CM", "CDM", "CB", "LB", "RB", "GK"].map(pos => (
                      <option key={pos} value={pos} className="bg-[#050e08]">{pos}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-[#5a8a6a] uppercase tracking-wider mb-1">
                    Current Club / Team
                  </label>
                  <input 
                    type="text"
                    required
                    value={editClub}
                    onChange={(e) => setEditClub(e.target.value)}
                    className="w-full bg-[#0a1a0f] border border-[#1a3825] text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#00e56b] font-sans"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-[#5a8a6a] uppercase tracking-wider mb-1">
                    Province (South Africa)
                  </label>
                  <select 
                    value={editProvince}
                    onChange={(e) => setEditProvince(e.target.value)}
                    className="w-full bg-[#0a1a0f] border border-[#1a3825] text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#00e56b] font-sans"
                  >
                    {["Gauteng", "Western Cape", "KwaZulu-Natal", "Eastern Cape", "Free State", "Limpopo", "Mpumalanga", "North West", "Northern Cape"].map(prov => (
                      <option key={prov} value={prov} className="bg-[#050e08]">{prov}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-[#5a8a6a] uppercase tracking-wider mb-1">
                  Biography / Pitch Statement
                </label>
                <textarea 
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={3}
                  className="w-full bg-[#0a1a0f] border border-[#1a3825] text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#00e56b] font-sans resize-none"
                  placeholder="Tell scouts about your drive and technical assets..."
                />
              </div>

              <div className="border-t border-[#1a3825]/40 pt-3">
                <h4 className="text-[10px] font-mono text-[#00e56b] uppercase tracking-widest mb-3">
                  Technical Attributes (1 - 99)
                </h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-[#5a8a6a] mb-1">
                      <span>Pace</span>
                      <span className="text-[#00e56b]">{editPace}</span>
                    </div>
                    <input 
                      type="range"
                      min="50"
                      max="99"
                      value={editPace}
                      onChange={(e) => setEditPace(Number(e.target.value))}
                      className="w-full accent-[#00e56b] bg-[#1a3825] h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-[#5a8a6a] mb-1">
                      <span>Vision</span>
                      <span className="text-[#00e56b]">{editVision}</span>
                    </div>
                    <input 
                      type="range"
                      min="50"
                      max="99"
                      value={editVision}
                      onChange={(e) => setEditVision(Number(e.target.value))}
                      className="w-full accent-[#00e56b] bg-[#1a3825] h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-[#5a8a6a] mb-1">
                      <span>Finishing</span>
                      <span className="text-[#00e56b]">{editFinishing}</span>
                    </div>
                    <input 
                      type="range"
                      min="50"
                      max="99"
                      value={editFinishing}
                      onChange={(e) => setEditFinishing(Number(e.target.value))}
                      className="w-full accent-[#00e56b] bg-[#1a3825] h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#1a3825]/40">
                <button 
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="py-2.5 bg-transparent border border-[#1a3825] hover:bg-red-950/20 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="py-2.5 bg-[#00e56b] text-[#050e08] hover:bg-[#00c85c] rounded-xl text-xs font-bold uppercase tracking-wider transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTrialConfirmModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-[#0a1a0f] border border-[#1a3825] w-full max-w-sm rounded-2xl p-6 space-y-5 text-center">
            <div className="w-14 h-14 rounded-full bg-[#00e56b]/10 border border-[#00e56b]/40 flex items-center justify-center mx-auto text-2xl">
              ✦
            </div>
            <p className="text-sm text-[#e8f5ee] leading-relaxed">
              Trial request sent to <strong className="text-white">{player.name}</strong>. They will be notified.
            </p>
            <button
              onClick={() => setShowTrialConfirmModal(false)}
              className="w-full py-3 bg-[#00e56b] text-[#050e08] rounded-xl text-xs font-bold uppercase tracking-wider hover:brightness-105 transition"
            >
              Done
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
