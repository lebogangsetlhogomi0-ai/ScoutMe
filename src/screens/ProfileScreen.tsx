import React, { useState, useRef } from "react";
import { formatSATimeAgo } from "../utils/saTime";
import { useApp } from "../context/AppContext";
import {
  ShieldCheck, AlertTriangle, ChevronRight, HelpCircle,
  Settings, Wifi, WifiOff, CreditCard, LogOut, Check, ToggleLeft, ToggleRight,
  Plus, Users, SwatchBook, Globe, Calendar, Medal, Trash2, Heart, MessageSquare,
  Tag, Pin, Landmark, MapPin, Eye, Trophy, Send, PlusCircle, CheckCircle, Share2,
  FolderLock, Archive, Sparkles, Smile, Star, Shield, X, Gem, Camera,
  ThumbsUp, Bookmark, Repeat2, Image as ImageIcon, Video, Maximize, Play, ChevronLeft
} from "lucide-react";
import { DigitalAgreementModal } from "../components/DigitalAgreementModal";
import { FollowListModal } from "../components/FollowListModal";
import { ClubPost, UserProfile, CareerMoment, PostHighlight } from "../types";
import { StoryViewer } from "../components/StoryViewer";
import { useToast } from "../components/Toast";

export const ProfileScreen: React.FC<{ clubId?: string; onBack?: () => void }> = ({ clubId, onBack }) => {
  const {
    currentUser,
    signOutUser,
    updateBio,
    updateAvatar,
    clubPosts,
    notifications,
    addClubPost,
    toggleLikeClubPost,
    toggleSaveClubPost,
    addClubPostComment,
    pinClubPost,
    deleteClubPost,
    users,
    addPlayerToSquad,
    removeFromSquad,
    toggleFollow,
    posts,
    careerMoments,
    addCareerMoment,
    deleteCareerMoment,
    toggleMySquad,
    archivePost,
    restorePost,
    deletePostPermanently,
    submitVerificationApplication,
    verificationApplications,
    reviewVerification,
    addClinicUpload,
    challengePosts,
    challengeResponses,
    spotlightPosts,
    createSpotlightPost,
    addChallengePost,
    awardScoutStamp,
    scoutStamps,
    votePost,
    toggleSavePost,
    repostPost,
    addComment,
  } = useApp();
  const { showToast } = useToast();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      showToast("This file type is not supported. Please use MP4, MOV for videos or JPG, PNG for images.", "error");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast("Photo too large. Please choose an image under 2MB.", "error");
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 400;
      const scale = Math.min(MAX / img.width, MAX / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      const base64 = canvas.toDataURL("image/jpeg", 0.85);
      updateAvatar(base64).then(() => showToast("Profile photo updated ✦", "success"));
    };
    img.src = url;
  };

  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [vRole, setVRole] = useState("scout");
  const [vOrg, setVOrg] = useState("");
  const [vSocials, setVSocials] = useState("");
  const [vDesc, setVDesc] = useState("");
  const [vReason, setVReason] = useState("");
  const [vSupport, setVSupport] = useState("");

  const [showClinicForm, setShowClinicForm] = useState(false);
  const [clinicName, setClinicName] = useState("");
  const [clinicPlayers, setClinicPlayers] = useState<string[]>([]);
  const [clinicMedia, setClinicMedia] = useState("");

  const [showSpotlightForm, setShowSpotlightForm] = useState(false);
  const [spotlightPlayerId, setSpotlightPlayerId] = useState("");
  const [spotlightText, setSpotlightText] = useState("");
  const [spotlightVideo, setSpotlightVideo] = useState("");

  const [dualViewModeCellular, setDualViewModeCellular] = useState<"scout" | "content">("scout");

  const [agreementOpen, setAgreementOpen] = useState(false);
  const [offlineCacheActive, setOfflineCacheActive] = useState(true);
  const [editingBio, setEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState("");

  // Dual-mode layout state (public feed page vs private scouting hub)
  const [profileViewMode, setProfileViewMode] = useState<"public" | "private">("public");

  // Post creation state
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [postType, setPostType] = useState<"matchday" | "signing" | "training" | "announcement" | "community">("announcement");
  const [mediaUrl, setMediaUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [taggedPlayerIds, setTaggedPlayerIds] = useState<string[]>([]);
  
  // Conditionally loaded sub-forms
  const [opponent, setOpponent] = useState("");
  const [score, setScore] = useState("");
  const [location, setLocation] = useState("");
  
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerPosition, setNewPlayerPosition] = useState("CAM");
  const [newPlayerId, setNewPlayerId] = useState("");

  // Feed Filter type
  const [feedFilter, setFeedFilter] = useState<string>("all");

  // Squad adding state
  const [squadAddOpen, setSquadAddOpen] = useState(false);
  const [squadPlayerId, setSquadPlayerId] = useState("");
  const [squadContractStatus, setSquadContractStatus] = useState<"Signed" | "Trial">("Signed");

  // Highlights (Career Moments) & Vault States
  const [activeHighlightMomentId, setActiveHighlightMomentId] = useState<string | null>(null);
  const [createHighlightOpen, setCreateHighlightOpen] = useState(false);
  const [newHighlightTitle, setNewHighlightTitle] = useState("");
  const [newHighlightSelectedPostIds, setNewHighlightSelectedPostIds] = useState<string[]>([]);
  const [newHighlightCoverUrl, setNewHighlightCoverUrl] = useState("");
  const [vaultOpen, setVaultOpen] = useState(false);
  const [followModal, setFollowModal] = useState<"followers" | "following" | null>(null);

  // Inline comment state per post
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentTextState, setCommentTextState] = useState("");

  // Profile post tabs
  const [profilePostTab, setProfilePostTab] = useState<"posts" | "reposts" | "saved" | "tagged">("posts");
  const [profilePostSubTab, setProfilePostSubTab] = useState<"all" | "highlight" | "match" | "training" | "full" | "photo">("all");
  const [carouselIndex, setCarouselIndex] = useState<Record<string, number>>({});

  if (!currentUser) return null;

  // Resolve target club user
  const clubUser = clubId ? users.find(u => u.userId === clubId) : currentUser;
  if (!clubUser) return null;

  const isOwner = !clubId || clubId === currentUser.userId;
  const isPlayer = clubUser.role === "player";
  const isClub = clubUser.role === "club";
  
  // Custom club colours (fallback to default green & gold)
  const clubColours = clubUser.clubColours || ["#00e56b", "#f5c518"];
  const primaryColor = clubColours[0];
  const secondaryColor = clubColours[1];

  React.useEffect(() => {
    if (clubUser) {
      setBioInput(clubUser.clubBio || clubUser.bio || "");
    }
  }, [clubId, currentUser, clubUser]);

  const getRoleColorClass = () => {
    switch (currentUser.role) {
      case "player": return "text-[#00e56b] border-[#00e56b]";
      case "scout": return "text-[#f5c518] border-[#f5c518]";
      case "club": return "text-[#4da6ff] border-[#4da6ff]";
      default: return "text-[#00e56b] border-[#00e56b]";
    }
  };

  const getStoryEmoji = (name: string) => {
    if (name.includes("Sipho")) return "⚽";
    if (name.includes("Thabo")) return "⚡";
    if (name.includes("Kagiso")) return "🥅";
    if (name.includes("Bongani")) return "🧤";
    if (name.includes("Ayanda")) return "💎";
    if (currentUser.role === "club") return "🛡️";
    return "🙋🏾‍♂️";
  };

  const handleSaveBio = () => {
    updateBio(bioInput);
    setEditingBio(false);
  };

  const handleCreatePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Choose sensible default assets if media URL is blank
    let finalMedia = mediaUrl.trim();
    if (!finalMedia) {
      if (postType === "matchday") {
        finalMedia = "https://assets.mixkit.co/videos/preview/mixkit-soccer-ball-hits-the-net-during-a-match-40501-large.mp4";
      } else if (postType === "signing") {
        finalMedia = "https://images.unsplash.com/photo-1543351611-58f69d7c1781?w=800&auto=format&fit=cover&q=60";
      } else {
        finalMedia = "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=cover&q=60";
      }
    }

    const postPayload: Partial<ClubPost> = {
      postType,
      mediaUrl: finalMedia,
      mediaType: finalMedia.includes(".mp4") ? "video" : "image",
      caption,
      tags: taggedPlayerIds,
      matchDetails: postType === "matchday" ? { opponent, score, location } : undefined,
      signingDetails: postType === "signing" ? { 
        playerName: newPlayerName || (newPlayerId ? users.find(u => u.userId === newPlayerId)?.name || "" : "New Recruit"), 
        position: newPlayerPosition, 
        taggedPlayerId: newPlayerId || undefined 
      } : undefined
    };

    addClubPost(postPayload);
    
    // Reset forms
    setCreatePostOpen(false);
    setCaption("");
    setMediaUrl("");
    setTaggedPlayerIds([]);
    setOpponent("");
    setScore("");
    setLocation("");
    setNewPlayerName("");
    setNewPlayerId("");
  };

  const handleAddCommentSubmit = (postId: string) => {
    if (!commentTextState.trim()) return;
    addClubPostComment(postId, commentTextState.trim());
    setCommentTextState("");
    setActiveCommentPostId(null);
  };

  const handleAddPlayerToSquadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!squadPlayerId) return;
    addPlayerToSquad(squadPlayerId, squadContractStatus);
    setSquadAddOpen(false);
    setSquadPlayerId("");
  };

  const handleCreateHighlightSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHighlightTitle.trim()) return;

    const finalCover = newHighlightCoverUrl.trim() || "https://images.unsplash.com/photo-1543351611-58f69d7c1781?w=800&auto=format&fit=cover&q=60";
    addCareerMoment(newHighlightTitle.trim(), finalCover, newHighlightSelectedPostIds);

    // Reset Form
    setCreateHighlightOpen(false);
    setNewHighlightTitle("");
    setNewHighlightSelectedPostIds([]);
    setNewHighlightCoverUrl("");
  };

  // Filter posts created by this club
  const activeClubPosts = clubPosts.filter(p => p.clubId === clubUser.userId);
  const filteredClubPosts = activeClubPosts.filter(p => {
    if (feedFilter === "all") return true;
    return p.postType === feedFilter;
  });

  return (
    <div className="flex-1 pb-24 overflow-y-auto w-full no-scrollbar px-3 space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-2">
          {onBack && (
            <button
              onClick={onBack}
              className="text-xs bg-[#0a1a0f] border border-[#1a3825] px-3.5 py-2.5 rounded-xl text-[#00e56b] font-mono hover:text-white hover:border-[#00e56b]/40 transition mr-1 font-bold"
            >
              ← BACK
            </button>
          )}
          <div>
            <h2 className="text-4xl font-extrabold tracking-wider font-bebas text-white">
              {isOwner ? "PROFILE" : "CLUB VIEW"} <span className="text-[#00e56b]">◉</span>
            </h2>
            <p className="text-xs text-[#5a8a6a] mt-0.5 font-medium uppercase font-mono">
              {isClub ? "Professional Club Executive Hub" : "Independent Digital Locker"}
            </p>
          </div>
        </div>

        {/* Dynamic visual indicator badge of the registered Club colors */}
        {isClub && (
          <div className="flex items-center space-x-1 border border-[#1a3825] px-2.5 py-1 rounded-full bg-[#050e08]/80">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: primaryColor }}></span>
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: secondaryColor }}></span>
            <span className="text-[10px] uppercase font-mono text-white font-bold ml-1">{currentUser.clubName || "FC"}</span>
          </div>
        )}
      </div>

      {/* PERSISTENT VIEW TOOGLE BAR (Clubs only - Owner Only) */}
      {isClub && isOwner && (
        <div className="bg-[#050e08]/90 backdrop-blur-md sticky top-0 z-40 py-2.5 border-y border-[#1a3825]/50 flex justify-center space-x-2">
          <button
            onClick={() => setProfileViewMode("public")}
            className={`flex-1 py-3 text-xs font-bold uppercase rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 ${
              profileViewMode === "public"
                ? "text-[#050e08] shadow-lg shadow-[#00e56b]/10"
                : "bg-[#0a1a0f] border border-[#1a3825] text-[#5a8a6a] hover:border-[#1a3825]/80"
            }`}
            style={{ backgroundColor: profileViewMode === "public" ? primaryColor : undefined }}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>📢 Public Club Page</span>
          </button>
          <button
            onClick={() => setProfileViewMode("private")}
            className={`flex-1 py-3 text-xs font-bold uppercase rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 ${
              profileViewMode === "private"
                ? "text-[#050e08] bg-[#f5c518] shadow-lg shadow-[#f5c518]/10"
                : "bg-[#0a1a0f] border border-[#1a3825] text-[#5a8a6a] hover:border-[#f5c518]/45"
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>🔒 Private Scouting Hub</span>
          </button>
        </div>
      )}

      {/* CONDITIONAL RENDER CHANNELS */}
      {(!isClub || profileViewMode === "public") ? (
        
        // PUBLIC Instagram-style Profile Page View (Also used for player/scout accounts)
        <div className="space-y-6">
          
          {/* PROFILE META INSTAGRAM STYLE */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div className="relative flex-shrink-0">
                {/* Hidden file input */}
                {isOwner && (
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                )}

                <div
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#0a1a0f] border-2 flex items-center justify-center text-4xl shadow-lg overflow-hidden"
                  style={{ borderColor: isClub ? primaryColor : "#00e56b" }}
                >
                  {clubUser.avatarBase64 ? (
                    <img
                      src={clubUser.avatarBase64}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    getStoryEmoji(clubUser.name)
                  )}
                </div>

                {/* Camera overlay — owner only */}
                {isOwner && (
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#00e56b] border-2 border-[#050e08] flex items-center justify-center shadow-md hover:brightness-110 active:scale-95 transition-all"
                    title="Change profile photo"
                  >
                    <Camera className="w-3.5 h-3.5 text-[#050e08]" />
                  </button>
                )}

                {isClub && clubUser.verified && (
                  <span className="absolute -bottom-1 -right-1 bg-[#00e56b] p-0.5 rounded-full border border-[#050e08]" title="Verified Academy/Club Account">
                    <CheckCircle className="w-4 h-4 text-[#050e08]" />
                  </span>
                )}
              </div>

              {/* Stats column metrics */}
              <div className="flex-1 flex justify-around ml-4 bg-[#0a1a0f] border border-[#1a3825] py-3.5 px-3 rounded-2xl font-sans text-center">
                <div>
                  <span className="block text-base font-extrabold text-[#e8f5ee] font-mono leading-none">
                    {isClub ? activeClubPosts.length : posts.filter(p => p.userId === clubUser.userId && !p.isArchived).length}
                  </span>
                  <span className="text-[10px] text-[#5a8a6a] uppercase block mt-1 tracking-wider font-semibold">Posts</span>
                </div>
                
                {isClub && (
                  <div className="border-x border-[#1a3825]/45 px-4">
                    <span className="block text-base font-extrabold text-[#e8f5ee] font-mono leading-none">
                      {clubUser.playersSigned || (clubUser.squad || []).filter(m => m.contractStatus === "Signed").length}
                    </span>
                    <span className="text-[10px] text-[#5a8a6a] uppercase block mt-1 tracking-wider font-semibold">Signed</span>
                  </div>
                )}

                <button className={`${!isClub ? "border-x border-[#1a3825]/45 px-8" : "pr-2"} text-center active:opacity-70 transition`} onClick={() => setFollowModal("followers")}>
                  <span className="block text-base font-extrabold text-[#e8f5ee] font-mono leading-none">
                    {isClub ? (clubUser.followers || []).length || clubUser.followersCount || 0 : (clubUser.followers || []).length}
                  </span>
                  <span className="text-[10px] text-[#5a8a6a] uppercase block mt-1 tracking-wider font-semibold">Followers</span>
                </button>

                {!isClub && (
                  <button className="text-center active:opacity-70 transition" onClick={() => setFollowModal("following")}>
                    <span className="block text-base font-extrabold text-[#e8f5ee] font-mono leading-none">
                      {(clubUser.following || []).length}
                    </span>
                    <span className="text-[10px] text-[#5a8a6a] uppercase block mt-1 tracking-wider font-semibold">Following</span>
                  </button>
                )}
              </div>
            </div>

            {/* Club/Personality metadata */}
            <div className="space-y-1">
              <h3 className="text-3xl font-extrabold text-[#e8f5ee] font-bebas tracking-wide flex items-center space-x-1.5">
                <span>{isClub ? clubUser.clubName || clubUser.name : clubUser.name}</span>
                {clubUser.tier === "community" && (
                  <span className="inline-flex items-center bg-[#00e56b]/10 text-[#00e56b] border border-[#00e56b]/40 rounded-full px-2 py-0.5 text-[9px] font-mono font-black scale-90 select-none">
                    <Shield className="w-2.5 h-2.5 mr-1 fill-current" />
                    Verified Community Builder
                  </span>
                )}
                {clubUser.tier === "professional" && (
                  <span className="inline-flex items-center bg-[#f5c518]/10 text-[#f5c518] border border-[#f5c518]/40 rounded-full px-2 py-0.5 text-[9px] font-mono font-black scale-90 select-none">
                    <Gem className="w-2.5 h-2.5 mr-1 fill-current" />
                    Verified Pro Scout
                  </span>
                )}
              </h3>
              
              <div className="flex flex-wrap gap-2 items-center text-xs text-[#5a8a6a] font-medium font-sans">
                <span className={`px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-widest bg-[#0f2318] border rounded-md ${getRoleColorClass()}`}>
                  {isClub ? `${clubUser.leagueAffiliation || "SAB League"} Executive` : 
                   clubUser.tier === "community" ? "Content Creator & Host 🎙️" :
                   clubUser.tier === "professional" ? "Professional Talents Scout 👁️" :
                   `${clubUser.role}`}
                </span>
                {isClub && clubUser.founded && (
                  <span className="flex items-center space-x-1 text-[#5a8a6a]">
                    <Calendar className="w-3.5 h-3.5 text-[#f5c518]" />
                    <span>Est. {clubUser.founded}</span>
                  </span>
                )}
                {isClub && clubUser.province && (
                  <span className="flex items-center space-x-1 text-[#5a8a6a]">
                    <MapPin className="w-3.5 h-3.5 text-[#00e56b]" />
                    <span>{clubUser.province} Province</span>
                  </span>
                )}
              </div>

              {isClub && clubUser.website && (
                <a 
                  href={clubUser.website} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="flex items-center space-x-1 text-xs text-[#00e56b] underline pt-0.5"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>{clubUser.website}</span>
                </a>
              )}
            </div>

            {/* Bio info */}
            <div className="space-y-1 bg-[#1a3020]/25 p-4 rounded-2xl border border-[#1a3825]/30">
              {editingBio ? (
                <div className="space-y-2">
                  <textarea
                    value={bioInput}
                    maxLength={150}
                    onChange={(e) => setBioInput(e.target.value)}
                    className="w-full bg-[#050e08] text-xs text-white p-3 rounded-lg border border-[#1a3825] resize-none focus:border-[#00e56b] outline-none"
                    rows={2}
                  />
                  <div className="flex justify-end space-x-2">
                    <button 
                      onClick={() => setEditingBio(false)} 
                      className="px-3 py-1.5 text-xs text-[#5a8a6a] font-bold"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleSaveBio} 
                      className="px-4 py-1.5 bg-[#00e56b] text-[#050e08] font-bold rounded-lg text-xs"
                    >
                      Save Bio
                    </button>
                  </div>
                </div>
              ) : (
                <p 
                  className={`text-xs text-[#5a8a6a] italic leading-relaxed ${isOwner ? "cursor-pointer hover:text-white" : ""}`} 
                  onClick={() => isOwner && setEditingBio(true)}
                  title={isOwner ? "Click to write a description!" : undefined}
                >
                  " {isClub ? (clubUser.clubBio || clubUser.bio || "Click here to add club development history and goals...") : (clubUser.bio || "Click to add a custom bio description detail here...")} "
                </p>
              )}
            </div>

            {/* Managerial Controls */}
            <div className="grid grid-cols-2 gap-3.5 pt-2">
              {isOwner ? (
                <>
                  <button 
                    onClick={() => setEditingBio(true)}
                    className="py-3.5 bg-[#0a1a0f] border border-[#1a3825] hover:border-[#00e56b]/40 text-white rounded-xl text-xs font-bold uppercase tracking-wider"
                  >
                    Edit Biography
                  </button>
                  
                  {isClub ? (
                    <button 
                      onClick={() => setCreatePostOpen(true)}
                      className="py-3.5 text-[#050e00] rounded-xl text-xs font-bold uppercase tracking-wider hover:brightness-105 flex items-center justify-center space-x-1 transition"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>Publish New Post</span>
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`https://scoutme.org/player/${currentUser?.userId}`).catch(() => {});
                        showToast("Locker link copied ✦", "success");
                      }}
                      className="py-3.5 bg-[#00e56b] text-[#050e08] rounded-xl text-xs font-bold uppercase tracking-wider hover:brightness-105"
                    >
                      Share My Locker
                    </button>
                  )}
                </>
              ) : (
                <>
                  {(() => {
                    const followingList = currentUser.following || [];
                    const isFollowingThisClub = followingList.includes(clubUser.userId);
                    return (
                      <button
                        onClick={() => toggleFollow(clubUser.userId)}
                        className={`py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
                          isFollowingThisClub
                            ? "bg-[#0e2315] text-[#00e56b] border border-[#00e56b]"
                            : "text-[#050e08]"
                        }`}
                        style={{ backgroundColor: !isFollowingThisClub ? primaryColor : undefined }}
                      >
                        {isFollowingThisClub ? "✔ Following" : "➕ Follow Club"}
                      </button>
                    );
                  })()}
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`https://scoutme.org/club/${currentUser?.userId}`).catch(() => {});
                      showToast("Club profile link copied ✦", "success");
                    }}
                    className="py-3.5 bg-[#0a1a0f] border border-[#1a3825] hover:border-white text-white rounded-xl text-xs font-bold uppercase tracking-wider"
                  >
                    Share Profile
                  </button>
                </>
              )}
            </div>
          </div>

          {/* VERIFIED PERSONALITY CREATOR DASHBOARD (Tier 2/3 and Owner Only) */}
          {isOwner && (currentUser.tier === "community" || currentUser.tier === "professional") && (
            <div className="bg-[#051108]/90 border-2 border-[#1a3825] p-5 rounded-3xl space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-[#1a3825] pb-3">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-[#00e56b]" />
                  <div>
                    <h4 className="text-sm font-bold uppercase text-white font-sans tracking-wide">
                      Verified Amplify Center
                    </h4>
                    <span className="text-[9px] uppercase font-mono text-[#5a8a6a]">
                      Grassroots Discovery & Validation Hub
                    </span>
                  </div>
                </div>
                <div className="text-[10px] bg-[#0f2318] px-2.5 py-1 rounded-full border border-[#1a3825] text-[#00e56b] font-mono">
                  {currentUser.tier === "professional" ? "⚽ PROFESSIONAL PRIVILEGES" : "🎙️ INFLUENCER TOOLS"}
                </div>
              </div>

              {/* TIER 3 ONLY: SCOUT STAMPS MANAGEMENTS */}
              {currentUser.tier === "professional" && (
                <div className="p-4 bg-[#141209] rounded-2xl border border-[#f5c518]/20 space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <Gem className="w-4 h-4 text-[#f5c518] fill-current animate-pulse" />
                      <span className="text-xs font-black uppercase text-[#f5c518] tracking-wider">
                        Professional Scout Stamps Allocation
                      </span>
                    </div>
                    <span className="text-[10px] bg-[#1d1b0d] text-[#f5c518] border border-[#f5c518]/30 px-2 py-0.5 rounded font-mono font-bold">
                      {scoutStamps.filter(s => s.scoutId === currentUser.userId).length} / 5 used this month
                    </span>
                  </div>
                  <p className="text-[10.5px] text-[#cca930] leading-relaxed select-none">
                    A Scout Stamp is an elite digital contract endorsement. It places a permanent high-contrast Gold Diamond tag on the player's profile and guarantees maximum exposure. Use wisely — limited to 5 players to prevent saturation.
                  </p>

                  <div className="bg-black/45 p-3 rounded-xl space-y-2.5">
                    <label className="block text-[9px] font-mono uppercase text-[#5a8a6a] font-bold">
                      Award Scout Stamp to Athlete:
                    </label>
                    <div className="flex space-x-2">
                      <select 
                        id="stamp_player_select"
                        className="flex-1 bg-[#141209]/80 border border-[#1a3825] text-white rounded-lg px-2 text-xs"
                      >
                        <option value="">-- Choose Prospect --</option>
                        {users.filter(u => u.role === "player" && !u.endorsed).map(p => (
                          <option key={p.userId} value={p.userId}>{p.name} ({p.position})</option>
                        ))}
                      </select>
                      <button
                        onClick={() => {
                          const selectVal = (document.getElementById("stamp_player_select") as HTMLSelectElement)?.value;
                          if (!selectVal) {
                            showToast("Select a valid grassroots player first.", "error");
                            return;
                          }
                          const confirmStamp = confirm("Awarding a Stamp is irreversible. Validate this profile?");
                          if (confirmStamp) {
                            awardScoutStamp(selectVal);
                            showToast("Scout Stamp awarded ✦", "success");
                          }
                        }}
                        className="bg-[#f5c518] text-[#050e08] py-2 px-3.5 rounded-lg text-xs font-bold uppercase"
                      >
                        Stamp Profile
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ACTION TOGGLE TILES */}
              <div className="grid grid-cols-2 gap-3 pb-1">
                <button
                  onClick={() => {
                    setShowSpotlightForm(!showSpotlightForm);
                    setShowClinicForm(false);
                  }}
                  className={`p-3.5 rounded-2xl border text-center flex flex-col items-center justify-center space-y-1.5 transition ${
                    showSpotlightForm
                      ? "bg-[#0f2318] border-[#00e56b] text-[#00e56b]"
                      : "bg-[#020703]/85 border-[#1a3825] text-[#a0c5ac] hover:border-[#1a3825]/90"
                  }`}
                >
                  <Sparkles className="w-5 h-5" />
                  <span className="text-xs font-serif font-extrabold uppercase tracking-wide">Publish Spotlight</span>
                  <span className="text-[9px] font-mono lowercase opacity-75">3 weekly limit</span>
                </button>

                <button
                  onClick={() => {
                    setShowClinicForm(!showClinicForm);
                    setShowSpotlightForm(false);
                  }}
                  className={`p-3.5 rounded-2xl border text-center flex flex-col items-center justify-center space-y-1.5 transition ${
                    showClinicForm
                      ? "bg-[#0f1f23] border-[#00efff] text-[#00efff]"
                      : "bg-[#020703]/85 border-[#1a3825] text-[#a0c5ac] hover:border-[#1a3825]/90"
                  }`}
                >
                  <Calendar className="w-5 h-5" />
                  <span className="text-xs font-serif font-extrabold uppercase tracking-wide">Clinic Auditing</span>
                  <span className="text-[9px] font-mono lowercase opacity-75">Tag training players</span>
                </button>
              </div>

              {/* EXPANDABLE INLINE FORMS */}
              {showSpotlightForm && (
                <div className="bg-[#0c1a10] border border-[#00e56b]/30 p-4.5 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-1.5 duration-200">
                  <div className="flex justify-between items-center border-b border-[#1a3825]/30 pb-2">
                    <span className="text-xs font-black uppercase text-[#00e56b] tracking-wider font-mono">
                      🌟 Write Spotlight Endorsement
                    </span>
                    <span className="text-[9px] text-[#5a8a6a]">RADAR BOOSTS GRASSROOTS</span>
                  </div>

                  <div className="space-y-3.5 text-xs">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] uppercase font-bold text-[#5a8a6a]">Select Spotlight Hero:</label>
                      <select 
                        required
                        value={spotlightPlayerId}
                        onChange={(e) => setSpotlightPlayerId(e.target.value)}
                        className="w-full bg-[#050e08] border border-[#1a3825] text-white p-2.5 rounded-xl block"
                      >
                        <option value="">-- Choose Player to Endorse --</option>
                        {users.filter(u => u.role === "player").map(p => (
                          <option key={p.userId} value={p.userId}>{p.name} ({p.position}) · {p.province}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] uppercase font-bold text-[#5a8a6a]">Endorsement analysis (max 280 chars):</label>
                      <textarea
                        required
                        maxLength={280}
                        rows={3}
                        value={spotlightText}
                        onChange={(e) => setSpotlightText(e.target.value)}
                        placeholder="Write why this youngster is outstanding. Avoid flowery language; focus on professional player mechanics, agility, attitude, and vision..."
                        className="w-full bg-[#050e08] border border-[#1a3825] text-white p-3 rounded-xl resize-none focus:outline-none focus:border-[#00e56b]"
                      />
                    </div>

                    <button
                      onClick={() => {
                        if (!spotlightPlayerId || !spotlightText.trim()) {
                          showToast("All spotlight fields are required.", "error");
                          return;
                        }
                        createSpotlightPost(spotlightPlayerId, spotlightText);
                        setSpotlightPlayerId("");
                        setSpotlightText("");
                        setShowSpotlightForm(false);
                        showToast("Spotlight Endorsement posted ✦", "success");
                      }}
                      className="w-full bg-[#00e56b] text-[#050e08] py-2.5 rounded-xl font-bold uppercase text-xs tracking-wider"
                    >
                      ✓ Publish Spotlight & Endorse Prospect
                    </button>
                  </div>
                </div>
              )}

              {showClinicForm && (
                <div className="bg-[#0b141a] border border-[#00efff]/30 p-4.5 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-1.5 duration-200">
                  <div className="flex justify-between items-center border-b border-[#1a3825]/30 pb-2">
                    <span className="text-xs font-black uppercase text-[#00efff] tracking-wider font-mono">
                      ⚽ Publish Clinic Showcase Session
                    </span>
                    <span className="text-[9px] text-[#5a8a6a]">MAPPED CLINIC TAGGING</span>
                  </div>

                  <div className="space-y-3.5 text-xs">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] uppercase font-bold text-[#5a8a6a]">Showcase / Clinic Title:</label>
                      <input
                        type="text"
                        required
                        value={clinicName}
                        onChange={(e) => setClinicName(e.target.value)}
                        placeholder="e.g. Soweto Owls Academy Scout Trial"
                        className="w-full bg-[#050e08] border border-[#1a3825] text-white px-3 py-2.5 rounded-xl focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] uppercase font-bold text-[#5a8a6a]">Tag Participating Athletes (Hold Ctrl to select multiple):</label>
                      <select 
                        multiple
                        value={clinicPlayers}
                        onChange={(e) => {
                          const selected: string[] = [];
                          for (let i = 0; i < e.target.options.length; i++) {
                            if (e.target.options[i].selected) {
                              selected.push(e.target.options[i].value);
                            }
                          }
                          setClinicPlayers(selected);
                        }}
                        className="w-full bg-[#050e08] border border-[#1a3825] h-24 text-white p-2 text-xs rounded-xl"
                      >
                        {users.filter(u => u.role === "player").map(p => (
                          <option key={p.userId} value={p.userId}>{p.name} ({p.position})</option>
                        ))}
                      </select>
                      <span className="text-[9px] text-[#5a8a6a] italic">Tagged athletes will instantly earn the 'Clinic Approved' badge on their profile search results!</span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] uppercase font-bold text-[#5a8a6a]">Media Video Link (mp4 format):</label>
                      <input
                        type="url"
                        value={clinicMedia}
                        onChange={(e) => setClinicMedia(e.target.value)}
                        placeholder="https://assets.mixkit.co/videos/preview/...mp4"
                        className="w-full bg-[#050e08] border border-[#1a3825] text-white px-3 py-2.5 rounded-xl focus:outline-none"
                      />
                    </div>

                    <button
                      onClick={() => {
                        if (!clinicName || clinicPlayers.length === 0) {
                          showToast("Showcase title and tagged players are required.", "error");
                          return;
                        }
                        addClinicUpload(clinicName, clinicPlayers, clinicMedia);
                        setClinicName("");
                        setClinicPlayers([]);
                        setClinicMedia("");
                        setShowClinicForm(false);
                        showToast("Clinic Showcase compiled ✦", "success");
                      }}
                      className="w-full bg-[#00efff] text-[#050e08] py-2.5 rounded-xl font-bold uppercase text-xs tracking-wider"
                    >
                      ✓ Publish Showcase & Tag Athletes
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CAREER MOMENTS HIGHLIGHTS REEL */}
          <div className="space-y-3 bg-[#0a1a0f]/40 p-4 rounded-3xl border border-[#1a3825]/25">
            <div className="flex justify-between items-center px-1">
              <h4 className="text-[11px] font-mono tracking-wider text-[#5a8a6a] uppercase font-bold flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#f5c518]" />
                <span>Career Moments & Highlights</span>
              </h4>
              
              {/* Profile Close friends / Squad Add Toggle (Only shown to other viewing accounts) */}
              {!isOwner && currentUser && (
                <button
                  onClick={() => toggleMySquad(clubUser.userId)}
                  className={`text-[9px] font-mono font-bold px-2.5 py-1 rounded-lg border transition flex items-center space-x-1 ${
                    (currentUser.mySquad || []).includes(clubUser.userId)
                      ? "bg-rose-950/40 border-rose-600/50 text-rose-400"
                      : "bg-[#07130b] border-[#1a3825] text-[#5a8a6a] hover:border-[#00e56b]/35 hover:text-[#00e56b]"
                  }`}
                  title="Toggle in Mutual Close Friends Squad"
                >
                  <Heart className={`w-3 h-3 ${ (currentUser.mySquad || []).includes(clubUser.userId) ? "fill-rose-500 text-rose-500" : "" }`} />
                  <span>{ (currentUser.mySquad || []).includes(clubUser.userId) ? "MUTUAL SQUAD" : "ADD SQUAD" }</span>
                </button>
              )}
              {isOwner && (
                <button
                  onClick={() => setVaultOpen(true)}
                  className="text-[9px] font-mono font-bold px-2.5 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-amber-500 hover:text-white hover:border-amber-500 transition flex items-center space-x-1"
                >
                  <Archive className="w-3 h-3" />
                  <span>VAULT</span>
                </button>
              )}
            </div>

            {/* Moments circle rail */}
            <div className="flex items-center space-x-3.5 overflow-x-auto no-scrollbar py-1">
              {careerMoments.filter(m => m.userId === clubUser.userId).map(moment => (
                <button
                  key={moment.momentId}
                  onClick={() => setActiveHighlightMomentId(moment.momentId)}
                  className="flex flex-col items-center flex-shrink-0 focus:outline-none group"
                >
                  <div 
                    className="w-[64px] h-[64px] rounded-full p-[2px] transition duration-200 group-hover:scale-105"
                    style={{ 
                      background: isClub ? "linear-gradient(to right, #cf9f0e, #ffd700)" : 
                                  isPlayer ? "linear-gradient(to right, #00cb5f, #adff2f)" : 
                                             "linear-gradient(to right, #00c6ff, #0072ff)" 
                    }}
                  >
                    <div className="w-full h-full rounded-full bg-black overflow-hidden border border-black p-[1px]">
                      <img
                        src={moment.coverUrl || "https://images.unsplash.com/photo-1543351611-58f69d7c1781?w=120&auto=format&fit=cover&q=60"}
                        alt={moment.title}
                        className="w-full h-full object-cover rounded-full"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-[#e8f5ee] mt-1.5 font-bold tracking-tight text-center max-w-[68px] truncate font-sans uppercase">
                    {moment.title}
                  </span>
                </button>
              ))}

              {/* Creator Button inside rail */}
              {isOwner && (
                <button
                  onClick={() => {
                    setNewHighlightTitle("");
                    setNewHighlightCoverUrl("");
                    setNewHighlightSelectedPostIds([]);
                    setCreateHighlightOpen(true);
                  }}
                  className="flex flex-col items-center flex-shrink-0 focus:outline-none group"
                >
                  <div className="w-[64px] h-[64px] rounded-full border-2 border-dashed border-[#1a3825] hover:border-[#00e56b] flex items-center justify-center transition bg-black">
                    <Plus className="w-5 h-5 text-[#5a8a6a] group-hover:text-[#00e56b]" />
                  </div>
                  <span className="text-[10px] text-[#5a8a6a] mt-1.5 font-mono tracking-tight font-bold text-center">
                    NEW MOMENT
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* ── POST TABS (all roles) ── */}
          {(() => {
            const myPosts = posts.filter(p => !p.isArchived && p.userId === clubUser.userId);
            const repostedPostIds = clubUser.repostIds || [];
            const repostedPosts = posts.filter(p => repostedPostIds.includes(p.postId));
            const savedPosts = posts.filter(p => (p.savedBy || []).includes(clubUser.userId));
            const taggedPosts = posts.filter(p => (p.taggedUsers || []).includes(clubUser.userId));

            const postsForTab = (() => {
              if (profilePostTab === "reposts") return repostedPosts;
              if (profilePostTab === "saved") return savedPosts;
              if (profilePostTab === "tagged") return taggedPosts;
              if (profilePostSubTab === "all") return myPosts;
              return myPosts.filter(p => p.contentType === profilePostSubTab);
            })();

            return (
              <div className="space-y-3">
                {/* Main tab bar */}
                <div className="flex border-b border-[#1a3825]/50">
                  {(["posts", "reposts", "saved", "tagged"] as const).map(tab => (
                    <button key={tab} onClick={() => setProfilePostTab(tab)}
                      className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wider transition ${
                        profilePostTab === tab
                          ? "text-[#00e56b] border-b-2 border-[#00e56b] -mb-px"
                          : "text-[#5a8a6a]"
                      }`}>
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Sub-tabs only for Posts */}
                {profilePostTab === "posts" && (
                  <div className="flex space-x-1.5 overflow-x-auto no-scrollbar pb-0.5">
                    {(["all", "highlight", "match", "training", "full", "photo"] as const).map(sub => (
                      <button key={sub} onClick={() => setProfilePostSubTab(sub)}
                        className={`flex-shrink-0 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition ${
                          profilePostSubTab === sub
                            ? "bg-[#00e56b]/15 text-[#00e56b] border border-[#00e56b]/40"
                            : "bg-[#0a1a0f] text-[#5a8a6a] border border-[#1a3825]"
                        }`}>
                        {sub === "all" ? "All" : sub === "highlight" ? "Highlights" : sub === "match" ? "Match Clips" : sub === "training" ? "Training" : sub === "full" ? "Full Match" : "Photos"}
                      </button>
                    ))}
                  </div>
                )}

                {/* Post cards */}
                {postsForTab.length === 0 ? (
                  <div className="text-center py-10 text-[#5a8a6a] text-xs bg-[#0a1a0f]/40 rounded-2xl border border-[#1a3825]/30">
                    {profilePostTab === "posts" ? "No posts yet. Upload a clip to get started."
                      : profilePostTab === "reposts" ? "No reposts yet."
                      : profilePostTab === "saved" ? "No saved posts yet."
                      : "No tagged posts yet."}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {postsForTab.map(post => {
                      const isVoted = false; // no per-user vote tracking yet
                      const isSaved = (post.savedBy || []).includes(currentUser.userId);
                      const isReposted = (post.repostedBy || []).includes(currentUser.userId);
                      const isImage = post.contentType === "photo" || (!post.videoUrl && post.thumbnailUrl);
                      const showComment = activeCommentPostId === post.postId;

                      return (
                        <div key={post.postId} className="bg-[#0a1a0f] border border-[#1a3825] rounded-2xl overflow-hidden">
                          {/* Header: just avatar */}
                          <div className="px-3 pt-3 pb-2 flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className="w-9 h-9 rounded-full bg-[#050e08] border-2 border-[#00e56b]/50 overflow-hidden flex items-center justify-center text-base flex-shrink-0">
                                {clubUser.avatarBase64
                                  ? <img src={clubUser.avatarBase64} className="w-full h-full object-cover" alt="" />
                                  : "🙋🏾‍♂️"}
                              </div>
                              <div>
                                <span className="text-[9px] text-[#5a8a6a] font-mono uppercase">{post.contentType} · {post.timestamp}</span>
                              </div>
                            </div>
                            {isImage ? <ImageIcon className="w-3.5 h-3.5 text-[#5a8a6a]" /> : <Video className="w-3.5 h-3.5 text-[#5a8a6a]" />}
                          </div>

                          {/* Media / Carousel */}
                          {(() => {
                            const urls = post.carouselUrls && post.carouselUrls.length > 1 ? post.carouselUrls : null;
                            const idx = carouselIndex[post.postId] || 0;
                            const currentUrl = urls ? urls[idx] : (post.videoUrl || post.thumbnailUrl || "");
                            const isCurrentImage = !currentUrl || currentUrl.match(/\.(jpg|jpeg|png|webp)/i) || (!currentUrl.match(/\.(mp4|mov|avi|mkv)/i) && isImage);
                            if (urls) {
                              return (
                                <div className="relative w-full">
                                  {isCurrentImage ? (
                                    <img src={currentUrl} alt="slide" className="w-full max-h-72 object-cover" />
                                  ) : (
                                    <div className="relative">
                                      <video src={currentUrl} controls playsInline className="w-full max-h-72 object-cover bg-black" />
                                      <button onClick={(e) => { e.stopPropagation(); (e.currentTarget.previousElementSibling as HTMLVideoElement)?.requestFullscreen?.().catch(() => {}); }} className="absolute bottom-2 right-2 bg-black/60 rounded-md p-1.5 text-white"><Maximize className="w-3.5 h-3.5" /></button>
                                    </div>
                                  )}
                                  {/* Dots */}
                                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-1">
                                    {urls.map((_, i) => (
                                      <button key={i} onClick={() => setCarouselIndex(prev => ({ ...prev, [post.postId]: i }))} className={`w-1.5 h-1.5 rounded-full transition ${i === idx ? "bg-white" : "bg-white/40"}`} />
                                    ))}
                                  </div>
                                  {/* Prev/Next */}
                                  {idx > 0 && <button onClick={() => setCarouselIndex(prev => ({ ...prev, [post.postId]: idx - 1 }))} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 rounded-full p-1 text-white"><ChevronLeft className="w-4 h-4" /></button>}
                                  {idx < urls.length - 1 && <button onClick={() => setCarouselIndex(prev => ({ ...prev, [post.postId]: idx + 1 }))} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 rounded-full p-1 text-white"><ChevronLeft className="w-4 h-4 rotate-180" /></button>}
                                  <div className="absolute top-2 right-2 bg-black/60 rounded text-[10px] text-white px-1.5 py-0.5">{idx + 1}/{urls.length}</div>
                                </div>
                              );
                            }
                            return post.videoUrl && !isImage ? (
                              <div className="relative">
                                <video src={post.videoUrl} controls playsInline className="w-full max-h-72 object-cover bg-black" poster={post.thumbnailUrl || undefined} />
                                <button onClick={(e) => { e.stopPropagation(); (e.currentTarget.previousElementSibling as HTMLVideoElement)?.requestFullscreen?.().catch(() => {}); }} className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm rounded-md p-1.5 text-white"><Maximize className="w-3.5 h-3.5" /></button>
                              </div>
                            ) : post.thumbnailUrl ? (
                              <img src={post.thumbnailUrl} alt="post" className="w-full max-h-72 object-cover" />
                            ) : (
                              <div className="w-full h-40 bg-[#050e08] flex items-center justify-center text-[#1a3825] text-3xl">⚽</div>
                            );
                          })()}

                          {/* Caption */}
                          {post.caption && (
                            <p className="px-3 pt-2.5 text-xs text-[#c8e6c9] leading-relaxed line-clamp-2">{post.caption}</p>
                          )}

                          {/* Action bar */}
                          <div className="flex items-center justify-between px-3 py-2.5">
                            <div className="flex items-center space-x-4">
                              {/* Vote */}
                              <button onClick={() => votePost(post.postId)} className="flex items-center space-x-1 text-[#5a8a6a] hover:text-[#00e56b] transition">
                                <ThumbsUp className="w-4 h-4" />
                                <span className="text-[11px] font-bold">{post.votes}</span>
                              </button>
                              {/* Comment */}
                              <button onClick={() => setActiveCommentPostId(showComment ? null : post.postId)} className="flex items-center space-x-1 text-[#5a8a6a] hover:text-white transition">
                                <MessageSquare className="w-4 h-4" />
                                <span className="text-[11px] font-bold">{post.commentsCount}</span>
                              </button>
                              {/* Repost */}
                              <button onClick={() => { if (!isReposted) repostPost(post.postId); }} className={`flex items-center space-x-1 transition ${isReposted ? "text-[#00e56b]" : "text-[#5a8a6a] hover:text-[#00e56b]"}`}>
                                <Repeat2 className="w-4 h-4" />
                                <span className="text-[11px] font-bold">{(post.repostedBy || []).length || ""}</span>
                              </button>
                            </div>
                            <div className="flex items-center space-x-3">
                              {/* Save */}
                              <button onClick={() => toggleSavePost(post.postId)} className={`transition ${isSaved ? "text-[#00e56b]" : "text-[#5a8a6a] hover:text-[#00e56b]"}`}>
                                <Bookmark className={`w-4 h-4 ${isSaved ? "fill-[#00e56b]" : ""}`} />
                              </button>
                              {/* Share */}
                              <button onClick={() => { navigator.clipboard.writeText(`https://scoutme.org/post/${post.postId}`).catch(() => {}); showToast("Link copied ✦", "success"); }} className="text-[#5a8a6a] hover:text-white transition">
                                <Share2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Inline comment input */}
                          {showComment && (
                            <div className="px-3 pb-3 flex space-x-2 border-t border-[#1a3825]/40 pt-2">
                              <input
                                type="text"
                                value={commentTextState}
                                onChange={e => setCommentTextState(e.target.value)}
                                placeholder="Write a comment..."
                                className="flex-1 bg-[#050e08] border border-[#1a3825] text-white text-xs px-3 py-2 rounded-lg outline-none focus:border-[#00e56b]"
                              />
                              <button
                                onClick={() => {
                                  if (!commentTextState.trim()) return;
                                  addComment(post.postId, commentTextState.trim());
                                  setCommentTextState("");
                                  setActiveCommentPostId(null);
                                }}
                                className="px-3 py-2 bg-[#00e56b] text-[#050e08] rounded-lg text-xs font-bold"
                              >
                                Post
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ACTIVE DISCOVERY POST COMPILER MODAL / PANEL */}
          {createPostOpen && isClub && (
            <div className="bg-[#0a1a0f] border-2 border-[#1a3825] p-5 rounded-2xl space-y-4 shadow-xl">
              <div className="flex justify-between items-center pb-2 border-b border-[#1a3825]/50">
                <h4 className="text-base font-bold text-white uppercase flex items-center space-x-1.5 font-sans">
                  <PlusCircle className="w-5 h-5 text-[#f5c518]" />
                  <span>CONSTRUCT NEW PUBLIC POST</span>
                </h4>
                <button 
                  onClick={() => setCreatePostOpen(false)}
                  className="text-xs text-[#5a8a6a] font-bold uppercase hover:text-white bg-[#050e08] px-3 py-1.5 rounded-lg border border-[#1a3825]"
                >
                  Dismiss
                </button>
              </div>

              <form onSubmit={handleCreatePostSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#5a8a6a] uppercase tracking-wide mb-1.5">
                      Post Type
                    </label>
                    <select
                      value={postType}
                      onChange={(e) => setPostType(e.target.value as any)}
                      className="w-full bg-[#050e08] border border-[#1a3825] text-white px-3 py-3 rounded-lg text-xs font-semibold"
                    >
                      <option value="announcement">📢 Announcement</option>
                      <option value="matchday">⚽ Matchday Outcome</option>
                      <option value="signing">✦ Player Signing ✦</option>
                      <option value="training">🥅 Training Drill</option>
                      <option value="community">📣 Community Outreach</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#5a8a6a] uppercase tracking-wide mb-1.5">
                      Media URL (Image / Video)
                    </label>
                    <input
                      type="url"
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                      placeholder="Leave blank for random soccer placeholder"
                      className="w-full bg-[#050e08] border border-[#1a3825] text-white px-3 py-2.5 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {/* CONDITIONAL SUBFORMS */}
                {postType === "matchday" && (
                  <div className="bg-[#050e08] border border-[#1a3825] p-4.5 rounded-xl space-y-3">
                    <span className="text-[10px] uppercase font-bold text-[#00e56b] block font-mono">🥅 Match Score Details</span>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] text-[#5a8a6a] font-bold uppercase mb-1">Opponent</label>
                        <input
                          type="text"
                          required
                          value={opponent}
                          onChange={(e) => setOpponent(e.target.value)}
                          placeholder="e.g. Kaizer Chiefs Dev"
                          className="w-full bg-[#0a1a0f] border border-[#1a3825]/80 text-white px-2.5 py-1.5 rounded text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-[#5a8a6a] font-bold uppercase mb-1">Outcome Score</label>
                        <input
                          type="text"
                          required
                          value={score}
                          onChange={(e) => setScore(e.target.value)}
                          placeholder="e.g. 2 - 1"
                          className="w-full bg-[#0a1a0f] border border-[#1a3825]/80 text-white px-2.5 py-1.5 rounded text-xs text-center font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-[#5a8a6a] font-bold uppercase mb-1">Location Venue</label>
                        <input
                          type="text"
                          required
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="e.g. Soweto Grounds"
                          className="w-full bg-[#0a1a0f] border border-[#1a3825]/80 text-white px-2.5 py-1.5 rounded text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {postType === "signing" && (
                  <div className="bg-[#050e08] border border-[#1a3825] p-4.5 rounded-xl space-y-3">
                    <span className="text-[10px] uppercase font-bold text-[#f5c518] block font-mono">✦ Signed Recruit Details</span>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] text-[#5a8a6a] font-bold uppercase mb-1">Recruit FullName</label>
                        <input
                          type="text"
                          required
                          value={newPlayerName}
                          onChange={(e) => setNewPlayerName(e.target.value)}
                          placeholder="e.g. Thabo Smith"
                          className="w-full bg-[#0a1a0f] border border-[#1a3825]/80 text-white px-2.5 py-1.5 rounded text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-[#5a8a6a] font-bold uppercase mb-1">Position Group</label>
                        <select
                          value={newPlayerPosition}
                          onChange={(e) => setNewPlayerPosition(e.target.value)}
                          className="w-full bg-[#0a1a0f] border border-[#1a3825]/80 text-white px-1.5 py-1.5 rounded text-xs"
                        >
                          <option value="GK">GK (Goalkeeper)</option>
                          <option value="CB">CB (Center Back)</option>
                          <option value="CDM">CDM (Anchor Mid)</option>
                          <option value="CAM">CAM (Apex Mid)</option>
                          <option value="ST">ST (Centre Forward)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-[#5a8a6a] font-bold uppercase mb-1">Link ScoutMe ID</label>
                        <select
                          value={newPlayerId}
                          onChange={(e) => setNewPlayerId(e.target.value)}
                          className="w-full bg-[#0a1a0f] border border-[#1a3825]/80 text-white px-1.5 py-1.5 rounded text-xs"
                        >
                          <option value="">-- No Link --</option>
                          {users.filter(u => u.role === "player").map(p => (
                            <option key={p.userId} value={p.userId}>{p.name} ({p.position})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Player Tag Manager */}
                <div>
                  <label className="block text-xs font-bold text-[#5a8a6a] uppercase tracking-wide mb-1.5">
                    Tag players in this post
                  </label>
                  <div className="flex flex-wrap gap-1.5 p-2 bg-[#050e08] border border-[#1a3825] rounded-xl text-xs min-h-[44px]">
                    {taggedPlayerIds.length === 0 ? (
                      <span className="text-[#5a8a6a] text-[11px] p-1 select-none">No active tags yet... Choose below</span>
                    ) : (
                      taggedPlayerIds.map(id => {
                        const playerObj = users.find(u => u.userId === id);
                        return (
                          <span 
                            key={id} 
                            onClick={() => setTaggedPlayerIds(prev => prev.filter(tid => tid !== id))}
                            className="bg-[#1a3020] text-[#00e56b] border border-[#00e56b]/30 px-2.0 py-1 rounded text-[10px] font-mono font-bold flex items-center space-x-1 cursor-pointer hover:bg-red-950 hover:text-red-400"
                          >
                            <span>🛸 {playerObj?.name || id}</span>
                            <span className="font-extrabold text-[8px]">×</span>
                          </span>
                        );
                      })
                    )}
                  </div>
                  
                  {/* tag selection pool */}
                  <div className="flex gap-2 overflow-x-auto py-1.5 mt-1 no-scrollbar select-none">
                    {users.filter(u => u.role === "player").map(p => {
                      const isTagged = taggedPlayerIds.includes(p.userId);
                      return (
                        <span
                          key={p.userId}
                          onClick={() => {
                            if (isTagged) {
                              setTaggedPlayerIds(prev => prev.filter(tid => tid !== p.userId));
                            } else {
                              setTaggedPlayerIds(prev => [...prev, p.userId]);
                              // If it is signing post, auto link the playerId to signingDetails
                              if (postType === "signing") {
                                setNewPlayerId(p.userId);
                                setNewPlayerName(p.name);
                                setNewPlayerPosition(p.position || "CAM");
                              }
                            }
                          }}
                          className={`px-2 py-1 rounded text-[10px] font-semibold whitespace-nowrap cursor-pointer transition ${
                            isTagged 
                              ? "bg-[#00e56b]/20 border border-[#00e56b] text-[#00e56b]" 
                              : "bg-[#0a1a0f] border border-[#1a3825] text-[#5a8a6a] hover:bg-[#152e1e]"
                          }`}
                        >
                          + {p.name}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5a8a6a] uppercase tracking-wide mb-1.5">
                    Post Caption *
                  </label>
                  <textarea
                    required
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Enter post details, stats, match reports or announcement terms..."
                    rows={3}
                    className="w-full bg-[#050e08] border border-[#1a3825] text-white px-4 py-3 rounded-xl text-sm resize-none focus:border-[#f5c518] outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 text-xs font-bold uppercase tracking-wider rounded-xl transition shadow-lg text-[#050e08]"
                  style={{ backgroundColor: primaryColor }}
                >
                  ⚡ Publish Post to Club Feed
                </button>
              </form>
            </div>
          )}

          {/* CLUB PUBLIC POST FEED CONTENT AREA */}
          {isClub && (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-[#1a3825]/40 pb-2">
                <h4 className="text-sm font-extrabold font-bebas tracking-wider text-[#5a8a6a] uppercase">
                  📣 CLUB DIGITAL TIMELINE
                </h4>

                {/* Filter pill selectors */}
                <div className="flex space-x-1 text-[10px] font-bold">
                  {["all", "matchday", "signing", "training"].map(type => (
                    <button
                      key={type}
                      onClick={() => setFeedFilter(type)}
                      className={`px-2 py-1 rounded uppercase tracking-wider transition ${
                        feedFilter === type
                          ? "bg-[#0f2318] border border-[#00e56b] text-[#00e56b]"
                          : "bg-transparent text-[#5a8a6a] border border-[#1a3825]/50 hover:text-white"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* POST RESULTS GRID OR LIST */}
              {filteredClubPosts.length === 0 ? (
                <div className="bg-[#0a1a0f] border border-[#1a3825] rounded-2xl p-8 text-center text-xs text-[#5a8a6a]">
                  No posts published yet on this digital feed timeline. Use "Publish New Post" at the top to highlight matches, signings or training.
                </div>
              ) : (
                <div className="space-y-5">
                  {filteredClubPosts.map(post => {
                    const isLiked = post.likedBy?.includes(currentUser.userId);
                    const isSaved = post.savedBy?.includes(currentUser.userId);
                    
                    return (
                      <div 
                        key={post.postId} 
                        className="bg-[#0a1a0f] border border-[#1a3825] rounded-2xl overflow-hidden shadow-lg relative flex flex-col"
                      >
                        {/* PINNED INDICATOR FLAG */}
                        {post.pinned && (
                          <div className="absolute top-3.5 right-3.5 bg-[#f5c518] text-[#050e08] font-bold font-sans text-[8px] uppercase tracking-wider px-2 py-0.5 rounded flex items-center space-x-1 z-10">
                            <Pin className="w-2.5 h-2.5 fill-[#050e08]" />
                            <span>PINNED MATCH REPORT</span>
                          </div>
                        )}

                        {/* HEAD HEADER */}
                        <div className="p-4 flex items-center justify-between border-b border-[#1a3825]/30">
                          <div className="flex items-center space-x-3.5">
                            <div 
                              className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold bg-[#050e08] border"
                              style={{ borderColor: primaryColor }}
                            >
                              🛡️
                            </div>
                            <div>
                              <span className="font-extrabold text-white text-xs block uppercase tracking-wide">
                                {currentUser.clubName || currentUser.name}
                              </span>
                              <span className="text-[10px] font-mono text-[#5a8a6a] uppercase">
                                {post.postType} · {formatSATimeAgo(post.timestamp)}
                              </span>
                            </div>
                          </div>

                          {/* actions dropdown button or pin toggle */}
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => pinClubPost(post.postId)}
                              className={`p-1.5 rounded-lg border transition ${
                                post.pinned 
                                  ? "bg-[#f5c518]/15 border-[#f5c518] text-[#f5c518]" 
                                  : "bg-[#050e08] border-[#1a3825] text-[#5a8a6a] hover:text-white"
                              }`}
                              title="Pin this Post to top of profile feed"
                            >
                              <Pin className="w-3.5 h-3.5" />
                            </button>
                            
                            <button
                              onClick={() => deleteClubPost(post.postId)}
                              className="p-1.5 bg-[#ff4444]/10 hover:bg-[#ff4444]/20 border border-[#ff4444]/40 text-[#ff4444] rounded-lg transition"
                              title="Delete timeline post"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* MEDIA COMPARTMENT */}
                        <div className="w-full bg-black relative max-h-[300px] overflow-hidden flex justify-center items-center">
                          {post.mediaType === "video" ? (
                            <video 
                              src={post.mediaUrl} 
                              controls 
                              playsInline 
                              muted
                              className="w-full object-cover max-h-[300px]"
                            />
                          ) : (
                            <img 
                              src={post.mediaUrl} 
                              alt="Club Post Media" 
                              className="w-full object-cover max-h-[300px]"
                              referrerPolicy="no-referrer"
                            />
                          )}

                          {/* Post type overlay tag */}
                          <span className="absolute bottom-3 left-3 bg-[#050e08]/90 text-white border border-[#1a3825] text-[9px] uppercase font-bold tracking-widest px-2.5 py-1 rounded">
                            {post.postType === "signing" ? "✦ NEW RECRUIT ✦" : post.postType}
                          </span>
                        </div>

                        {/* SCORE / SIGNING OVERLAYS */}
                        {post.postType === "matchday" && post.matchDetails && (
                          <div className="bg-[#0f2318] border-y border-[#1a3825] p-3 text-center flex justify-around items-center font-sans tracking-wide">
                            <div className="text-center">
                              <span className="text-[10px] text-[#5a8a6a] uppercase">CLUB</span>
                              <span className="block text-xs font-bold text-white font-mono">{currentUser.clubName || "Diepkloof FC"}</span>
                            </div>
                            <div className="bg-[#050e08] border border-[#1a3825]/90 px-4 py-1.5 rounded-lg">
                              <span className="text-base font-extrabold text-[#00e56b] font-mono">{post.matchDetails.score}</span>
                            </div>
                            <div className="text-center">
                              <span className="text-[10px] text-[#5a8a6a] uppercase">OPPONENT</span>
                              <span className="block text-xs font-bold text-[#ff4444] font-mono">{post.matchDetails.opponent}</span>
                            </div>
                          </div>
                        )}

                        {post.postType === "signing" && post.signingDetails && (
                          <div className="bg-[#1f1b0a] border-y border-[#1a3825] p-3 flex justify-between items-center text-xs px-5">
                            <div className="flex items-center space-x-2">
                              <span className="text-base">🤝</span>
                              <div>
                                <span className="block font-bold text-white uppercase">{post.signingDetails.playerName}</span>
                                <span className="text-[9px] text-[#5a8a6a] font-mono uppercase">Position: {post.signingDetails.position}</span>
                              </div>
                            </div>
                            <span className="bg-[#f5c518] text-[#050e08] text-[9px] px-2 py-0.5 rounded font-bold font-mono">
                              CONTRACT SIGNED
                            </span>
                          </div>
                        )}

                        {/* CAPTION AND TAGS PANEL */}
                        <div className="p-4 space-y-3">
                          <p className="text-xs text-white leading-relaxed">
                            {post.caption}
                          </p>

                          {/* Tagged athletes */}
                          {post.tags && post.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 items-center pt-1.5 border-t border-[#1a3825]/20">
                              <Tag className="w-3.5 h-3.5 text-[#00e56b]" />
                              <span className="text-[10px] uppercase font-bold text-[#5a8a6a] mr-1">Tagged:</span>
                              {post.tags.map(id => {
                                const playerObj = users.find(u => u.userId === id);
                                return (
                                  <span key={id} className="bg-[#0f2318] border border-[#1a3825] text-[#00e56b] font-mono text-[9px] px-2 py-0.5 rounded font-semibold">
                                    @{playerObj?.name || id}
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          {/* INTERACTIVE ACTIONS COMPARTMENT */}
                          <div className="flex items-center justify-between border-t border-[#1a3825]/25 pt-3 mt-1 text-xs">
                            <div className="flex space-x-4 items-center">
                              {/* Liking */}
                              <button 
                                onClick={() => toggleLikeClubPost(post.postId)}
                                className={`flex items-center space-x-1 font-mono hover:text-red-400 select-none ${isLiked ? "text-red-500 font-bold" : "text-[#5a8a6a]"}`}
                              >
                                <Heart className={`w-4 h-4 ${isLiked ? "fill-red-500 text-red-500" : ""}`} />
                                <span>{post.likes || 0}</span>
                              </button>

                              {/* Comment details */}
                              <button 
                                onClick={() => setActiveCommentPostId(activeCommentPostId === post.postId ? null : post.postId)}
                                className="flex items-center space-x-1 text-[#5a8a6a] font-mono hover:text-[#00e56b]"
                              >
                                <MessageSquare className="w-4 h-4" />
                                <span>{post.commentsList?.length || post.comments || 0}</span>
                              </button>
                            </div>

                            <button 
                              onClick={() => toggleSaveClubPost(post.postId)}
                              className={`flex items-center space-x-1 ${isSaved ? "text-[#00e56b]" : "text-[#5a8a6a]"}`}
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              <span className="text-[10px] uppercase tracking-wider font-semibold">Save Post</span>
                            </button>
                          </div>

                          {/* INLINE COMMENT VIEWER & COMPOSER */}
                          {(activeCommentPostId === post.postId || (post.commentsList && post.commentsList.length > 0)) && (
                            <div className="bg-[#050e08]/75 p-3.5 rounded-xl border border-[#1a3825]/40 mt-2 space-y-3">
                              {/* comment list */}
                              {post.commentsList && post.commentsList.length > 0 && (
                                <div className="space-y-2.5 max-h-[140px] overflow-y-auto no-scrollbar font-sans text-[11px] divide-y divide-[#1a3825]/20">
                                  {post.commentsList.map(c => (
                                    <div key={c.commentId} className="pt-2 flex items-start justify-between">
                                      <div className="space-y-0.5">
                                        <span className="font-bold text-white mr-1.5 uppercase tracking-wide text-[9px] bg-[#0c1c11] border border-[#1a3825] px-1 rounded inline-block">
                                          {c.userName} ({c.role})
                                        </span>
                                        <p className="text-[#e8f5ee] font-medium leading-relaxed">{c.text}</p>
                                      </div>
                                      <span className="text-[8px] font-mono text-[#5a8a6a] uppercase">just now</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* compose entry */}
                              {activeCommentPostId === post.postId && (
                                <div className="flex items-center space-x-2 pt-1 border-t border-[#1a3825]/30">
                                  <input
                                    type="text"
                                    value={commentTextState}
                                    onChange={(e) => setCommentTextState(e.target.value)}
                                    placeholder="Write a comment..."
                                    className="flex-1 bg-[#0a1a0f] text-white px-3 py-2 rounded-lg text-xs border border-[#1a3825] outline-none placeholder-[#5a8a6a]"
                                  />
                                  <button
                                    onClick={() => handleAddCommentSubmit(post.postId)}
                                    className="bg-[#00e56b] hover:bg-[#00c85e] p-2 rounded-lg text-[#050e08] transition"
                                  >
                                    <Send className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* PLAYER ONLY ACCESSORY PANELS */}
          {isPlayer && (
            <>
              {/* DIGITAL AGREEMENT STATUS CARD */}
              <div className="space-y-3">
                <h4 className="text-sm font-extrabold tracking-wide text-[#5a8a6a] uppercase">
                  Club Negotiation Compact State
                </h4>

                {currentUser.agreementSigned ? (
                  <div className="bg-[#0f2318] border border-[#00e56b] p-4.5 rounded-2xl flex items-start space-x-3.5">
                    <ShieldCheck className="w-5.5 h-5.5 mt-0.5 text-[#00e56b] shrink-0" />
                    <div className="space-y-1">
                      <span className="text-xs font-extrabold uppercase tracking-wide text-[#00e56b] block">
                        ✔ DIGITAL AGREEMENT SIGNED
                      </span>
                      <p className="text-[11px] text-[#5a8a6a] leading-relaxed">
                        Account configured for active PSL discovery. ScoutMe protections and solidarity fee audit declarations are fully synced.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#ff4444]/15 border border-[#ff4444]/60 p-4.5 rounded-2xl flex flex-col space-y-3">
                    <div className="flex items-start space-x-3.5">
                      <AlertTriangle className="w-5.5 h-5.5 mt-0.5 text-[#ff4444] shrink-0" />
                      <div className="space-y-1">
                        <span className="text-xs font-extrabold uppercase tracking-wide text-[#ff4444] block">
                          ⚠ SIGN DIGITAL AGREEMENT
                        </span>
                        <p className="text-[11px] text-[#5a8a6a] leading-relaxed">
                          You must review and electronically sign our digital compact to enable direct trial invitation proposals from national scouts.
                        </p>
                      </div>
                    </div>

                    <button
                      id="profile_sign_agreement_btn"
                      onClick={() => setAgreementOpen(true)}
                      className="w-full py-2.5 bg-[#ff4444] hover:bg-[#ff3333] text-[#050e08] font-bold uppercase tracking-wider rounded-xl text-xs transition"
                    >
                      SIGN AGREEMENT NOW
                    </button>
                  </div>
                )}
              </div>

              {/* MY STATS CARD */}
              <div className="bg-[#0a1a0f] border border-[#1a3825] p-5 rounded-2xl space-y-4">
                <h4 className="text-sm font-extrabold font-bebas tracking-wide text-[#5a8a6a] uppercase">
                  📈 Live Scouting Metrics
                </h4>

                <div className="divide-y divide-[#1a3825]/45 select-none font-sans text-xs">
                  <div className="py-2.5 flex justify-between items-center bg-[#050e08]/20 px-2 rounded">
                    <span className="text-[#5a8a6a]">Profile views peak</span>
                    <span className="font-mono font-bold text-[#00e56b]">{(currentUser.views || 12400).toLocaleString()}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center bg-[#050e08]/20 px-2 rounded mt-1.5">
                    <span className="text-[#5a8a6a]">Scout Endorsements count</span>
                    <span className="font-mono font-bold text-[#f5c518]">{currentUser.endorsed ? "1 Verified" : "0 Verified"}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center bg-[#050e08]/20 px-2 rounded mt-1.5">
                    <span className="text-[#5a8a6a]">Democratic Community Votes</span>
                    <span className="font-mono font-bold text-[#4da6ff]">{(currentUser.votes || 847).toLocaleString()}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center bg-[#050e08]/20 px-2 rounded mt-1.5">
                    <span className="text-[#5a8a6a]">Analytical Intelligence Reports</span>
                    <span className="font-mono font-bold text-[#e8f5ee]">1 Generated</span>
                  </div>
                </div>
              </div>
            </>
          )}

        </div>
      ) : (
        
        // SCOUTING HUB VIEW - PRIVATE Scouting Dashboard (Only accessible for Club Executives)
        <div className="space-y-6">
          
          {/* PRIVATE SQUAD MANAGER */}
          <div className="bg-[#0a1a0f] border border-[#1a3825] p-5 rounded-2xl space-y-4 relative overflow-hidden">
            <span className="absolute top-0 right-0 bg-[#f5c518]/15 text-[#f5c518] border-l border-b border-[#1a3825]/50 px-3 py-1 text-[8px] font-mono uppercase font-bold tracking-wider">
              Club Administration
            </span>

            <div className="flex justify-between items-center">
              <h4 className="text-base font-bold text-white uppercase flex items-center space-x-2 font-sans">
                <Users className="text-[#f5c518] w-5 h-5" />
                <span>ACTIVE ATHLETES SQUAD</span>
              </h4>
              
              <button 
                onClick={() => setSquadAddOpen(!squadAddOpen)}
                className="bg-[#050e08] border border-[#1a3825] text-[#f5c518] text-xs font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:bg-[#1a1c0d] transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ROSTER RECRUIT</span>
              </button>
            </div>

            {/* SQUAD ADD RECUPERATOR CHOOSER */}
            {squadAddOpen && (
              <div className="bg-[#050e08] border-2 border-[#f5c518]/30 p-4 rounded-xl space-y-3.5">
                <span className="text-[10px] font-mono font-bold text-[#f5c518] block uppercase">🛸 SIGN REGISTERED PLAYER TO SQUAD</span>
                <form onSubmit={handleAddPlayerToSquadSubmit} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[10px] text-[#5a8a6a] uppercase tracking-wide mb-1 font-bold">Select Candidate Player</label>
                      <select
                        required
                        value={squadPlayerId}
                        onChange={(e) => setSquadPlayerId(e.target.value)}
                        className="w-full bg-[#0a1a0f] border border-[#1a3825] text-white px-3 py-2.5 rounded-lg text-xs"
                      >
                        <option value="">-- Choose registered player --</option>
                        {users.filter(u => u.role === "player").map(p => (
                          <option key={p.userId} value={p.userId}>{p.name} ({p.position} · Age {p.age})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-[#5a8a6a] uppercase tracking-wide mb-1 font-bold">Contract Affiliation Status</label>
                      <select
                        value={squadContractStatus}
                        onChange={(e) => setSquadContractStatus(e.target.value as any)}
                        className="w-full bg-[#0a1a0f] border border-[#1a3825] text-white px-3 py-2.5 rounded-lg text-xs font-semibold"
                      >
                        <option value="Signed">Signed Player Account</option>
                        <option value="Trial">Pre-Contract trial period</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#f5c518] hover:bg-[#d6a90c] text-[#050e08] text-xs font-extrabold uppercase tracking-wider rounded-lg transition"
                  >
                    ✔ Add Player to Official Squad Registry
                  </button>
                </form>
              </div>
            )}

            {/* ACTIVE SQUAD LIST */}
            {(!currentUser.squad || currentUser.squad.length === 0) ? (
              <div className="bg-[#050e08]/50 border border-[#1a3825]/40 rounded-xl p-6 text-center text-xs text-[#5a8a6a]">
                No active players registered in your squad roster. Click "Roster Recruit" to add players from ScoutMe.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentUser.squad.map(member => (
                  <div 
                    key={member.userId}
                    className="bg-[#050e08] border border-[#1a3825] rounded-xl p-3.5 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-[#1a3020]/40 text-[#00e56b] font-bold font-sans text-xs flex items-center justify-center border border-[#00e56b]/20">
                        {member.position}
                      </div>

                      <div>
                        <span className="block text-xs font-bold text-white uppercase">{member.name}</span>
                        <div className="flex items-center space-x-2 text-[10px] text-[#5a8a6a] mt-0.5">
                          <span>Age {member.age}</span>
                          <span>•</span>
                          <span className="font-mono text-[#00e56b] font-semibold">AI Rating: {member.aiScore}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={`text-[8px] font-mono uppercase font-black px-2 py-0.5 rounded ${
                        member.contractStatus === "Signed" 
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-900/60" 
                          : "bg-amber-950 text-amber-400 border border-amber-900/60"
                      }`}>
                        {member.contractStatus}
                      </span>

                      <button
                        onClick={() => removeFromSquad(member.userId)}
                        className="p-1.5 bg-red-950/20 hover:bg-red-950/50 border border-red-900/40 text-red-400 rounded-lg transition"
                        title="Release of contract from squad roster"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RETRIEVED PRIVATE SCOUTING UTILITIES */}
          <div className="space-y-4">
            <h4 className="text-sm font-extrabold font-bebas tracking-wide text-[#5a8a6a] uppercase">
              🔭 INTEGRATED LEVEL PRIVATE SCOUT TOOLS
            </h4>

            {/* scout specs */}
            <div className="bg-[#0a1a0f] border border-[#1a3825] p-5 rounded-2xl grid grid-cols-2 gap-4 text-xs">
              <div className="bg-[#050e08]/65 p-3 rounded-xl">
                <span className="text-[10px] text-[#5a8a6a] block uppercase font-mono mb-1">Scouting Agency / Network</span>
                <span className="text-white font-bold block">{currentUser.organisation || "Amateur Scout Network"}</span>
              </div>
              <div className="bg-[#050e08]/65 p-3 rounded-xl">
                <span className="text-[10px] text-[#5a8a6a] block uppercase font-mono mb-1">Registration Designation</span>
                <span className="text-white font-bold block">{currentUser.scoutRole || "Independent Scout"}</span>
              </div>
            </div>

            {/* strategic intel link proxy */}
            <div className="bg-[#0f2318] border border-[#00e56b]/30 p-5 rounded-2xl flex items-start space-x-3.5">
              <Trophy className="w-6 h-6 text-[#f5c518] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="text-xs font-extrabold uppercase text-[#e8f5ee] block">
                  NEURAL INTEL PLATFORM ACCESS
                </span>
                <p className="text-[11px] text-[#5a8a6a] leading-relaxed">
                  Your club executive role is fully connected to the active Artificial Intelligence Deep Neural Network. Queries are live-sourced from the main Digital Feed sidebar index.
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* OFFLINE ENGINE CACHE STATUS PANEL */}
      <div className="bg-[#0a1a0f] border border-[#1a3825] p-5 rounded-2xl flex items-center justify-between shadow-md">
        <div className="space-y-1 pr-4">
          <div className="flex items-center space-x-2">
            {offlineCacheActive ? (
              <Wifi className="w-4 h-4 text-[#00e56b]" />
            ) : (
              <WifiOff className="w-4 h-4 text-[#5a8a6a]" />
            )}
            <h4 className="text-xs font-extrabold uppercase text-white tracking-wide">
              Profile Cached for Offline Access
            </h4>
          </div>
          <p className="text-[10.5px] text-[#5a8a6a] leading-relaxed">
            Synchronizes active highlights without active mobile data. Last sync: just now.
          </p>
        </div>

        <button
          id="offline_sync_toggle"
          onClick={() => setOfflineCacheActive(!offlineCacheActive)}
          className="p-1 focus:outline-none focus:ring-1 focus:ring-[#00e56b]/30"
        >
          {offlineCacheActive ? (
            <ToggleRight className="w-10 h-10 text-[#00e56b]" />
          ) : (
            <ToggleLeft className="w-10 h-10 text-[#5a8a6a]" />
          )}
        </button>
      </div>

      {/* TIMELINE LEGAL SETTINGS REGISTRY ROW */}
      <div className="space-y-4">
        <h4 className="text-sm font-extrabold tracking-wide text-[#5a8a6a] uppercase">Identity & Settings Registry</h4>

        <div className="divide-y divide-[#1a3825]/45 bg-[#0a1a0f] border border-[#1a3825] rounded-xl overflow-hidden text-xs">
          
          {/* Upgrade to Pro — scouts and clubs only */}
          {(currentUser?.role === "scout" || currentUser?.role === "club") && (
          <div
            className="p-4 flex justify-between items-center bg-[#1a3825]/20 hover:bg-[#1a3825]/40 cursor-pointer border-b border-[#00e56b]/20"
            onClick={() => (window as any).triggerPaymentFlow()}
          >
            <div className="space-y-0.5">
              <span className="text-[#00e56b] font-bold block flex items-center">
                <Gem className="w-3.5 h-3.5 text-[#00e56b] mr-1.5" />
                Upgrade to Pro Subscriptions
              </span>
              <span className="text-[10px] text-[#5a8a6a] block uppercase font-mono">
                {currentUser?.tier === "professional"
                  ? "⚡ Pro Subscription Active!"
                  : "R49 - R299/mo · Unlock Golden Radar, Benchmarks & PDF Cards"}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-[#00e56b]" />
          </div>
          )}

          {/* Apply for Verified Status */}
          <div 
            className="p-4 flex justify-between items-center bg-[#07130b] hover:bg-[#0f2318] cursor-pointer" 
            onClick={() => setVerificationModalOpen(true)}
          >
            <div className="space-y-0.5">
              <span className="text-white font-bold block flex items-center">
                <ShieldCheck className="w-3.5 h-3.5 text-[#f5c518] mr-1.5 fill-current" />
                Apply for Verified Personality Status
              </span>
              <span className="text-[10px] text-[#5a8a6a] block uppercase font-mono">
                {currentUser.tier ? `Active Status: Verified ${currentUser.tier.toUpperCase()}` : "Independent/Amateur Status · Access Privileges"}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-[#5a8a6a]" />
          </div>

          {/* SIMULATED ADMIN PITCH AUDITING CONTROL (Demo Playground Suite) */}
          <div className="p-4 bg-[#140b09] border border-red-950/20">
            <span className="text-[9px] font-mono uppercase bg-red-950 text-[#ff7755] px-2 py-0.5 rounded font-black tracking-widest inline-block mb-3 select-none">
              DEMO REVIEW PLAYGROUND: PENDING APPLICATIONS AUDIT
            </span>
            {verificationApplications && verificationApplications.filter(a => a.status === "pending").length === 0 ? (
              <p className="text-[10px] text-[#5a8a6a] italic">
                No pending application requests in system cache. Submit one using 'Apply for Verified Personality' above to try it out!
              </p>
            ) : (
              <div className="space-y-3 mt-1.5">
                {verificationApplications.filter(a => a.status === "pending").map(app => (
                  <div key={app.applicationId} className="bg-[#050e08] border border-red-900/15 p-3.5 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className="text-white">Applicant ID: {app.name}</span>
                      <span className="text-red-400 capitalize">{app.role.toUpperCase()} tier requested</span>
                    </div>
                    <div className="text-[10.5px] text-[#dfccd5] space-y-1">
                      <p><b>Affiliation:</b> {app.organisation}</p>
                      <p><b>Aspiration:</b> "{app.reason}"</p>
                    </div>
                    <div className="flex space-x-2 pt-1 border-t border-[#1a3825]/30">
                      <button
                        onClick={() => {
                          reviewVerification(app.applicationId, "approved");
                          showToast(`Application validated for ${app.name} ✦`, "success");
                        }}
                        className="flex-1 bg-[#00e56b] hover:bg-[#153e19] text-[#050e08] hover:text-white py-1.5 rounded text-[10px] font-bold uppercase transition"
                      >
                        ✓ ACCEPT & AMPLIFY
                      </button>
                      <button
                        onClick={() => {
                          reviewVerification(app.applicationId, "rejected");
                          showToast("Application dismissed.", "info");
                        }}
                        className="bg-red-950 text-red-400 p-1.5 rounded text-[10px] hover:bg-red-900 transition"
                      >
                        DISMISS
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-4 flex justify-between items-center hover:bg-[#0f2318]/50 cursor-pointer" onClick={() => setAgreementOpen(true)}>
            <div className="space-y-0.5">
              <span className="text-[#e8f5ee] font-medium font-sans">ScoutMe Placement Agreement</span>
              <span className="text-[10px] uppercase font-mono block">
                {currentUser.agreementSigned ? (
                  <span className="text-[#00e56b] font-bold">● SIGNED & RECORDED</span>
                ) : (
                  <span className="text-[#ff4444] font-bold">● UNSIGNED (Action Required)</span>
                )}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-[#5a8a6a]" />
          </div>

          <div className="p-4 flex justify-between items-center hover:bg-[#0f2318]/50 cursor-pointer" onClick={() => showToast("Account settings are locked in this preview.", "info")}>
            <span className="text-[#e8f5ee] font-medium font-sans">Account Settings Profile</span>
            <ChevronRight className="w-4 h-4 text-[#5a8a6a]" />
          </div>

          <div className="p-4 flex justify-between items-center hover:bg-[#0f2318]/50 cursor-pointer" onClick={() => showToast("Notification preferences are live.", "info")}>
            <span className="text-[#e8f5ee]">Notification Preferences</span>
            <ChevronRight className="w-4 h-4 text-[#5a8a6a]" />
          </div>

          <div className="p-4 flex justify-between items-center hover:bg-[#0f2318]/50 cursor-pointer" onClick={() => showToast("Privacy settings follow GDPR-aligned defaults.", "info")}>
            <span className="text-[#e8f5ee]">Privacy & Visibility Policies</span>
            <ChevronRight className="w-4 h-4 text-[#5a8a6a]" />
          </div>

          {/* Payment Gateway Methods — scouts and clubs only */}
          {(currentUser?.role === "scout" || currentUser?.role === "club") && (
          <div className="p-4 flex justify-between items-center hover:bg-[#0f2318]/50 cursor-pointer" onClick={() => (window as any).triggerPaymentFlow()}>
            <div className="space-y-0.5">
              <span className="text-[#e8f5ee] block">Payment Gateway Methods</span>
              <span className="text-[10px] text-[#00e56b] uppercase block font-mono">Ozow and PayFast configured</span>
            </div>
            <CreditCard className="w-4.5 h-4.5 text-[#5a8a6a]" />
          </div>
          )}

          <div className="p-4 flex justify-between items-center hover:bg-[#0f2318]/50 cursor-pointer" onClick={() => showToast("WhatsApp support is online — ScoutMe ✦", "info")}>
            <span className="text-[#e8f5ee]">Help and Support Desk</span>
            <ChevronRight className="w-4 h-4 text-[#5a8a6a]" />
          </div>

          {/* Sign Out (in red highlights) */}
          <div 
            id="profile_sign_out_row"
            onClick={signOutUser} 
            className="p-4 flex justify-between items-center bg-[#ff4444]/5 hover:bg-[#ff4444]/15 cursor-pointer text-[#ff4444] transition-all"
          >
            <span className="font-bold uppercase tracking-wider">Sign Out from Locker</span>
            <LogOut className="w-4.5 h-4.5" />
          </div>

        </div>
      </div>

      {/* VERIFICATION APPLICATION INTERACTIVE MODAL COMPLETED */}
      {verificationModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-[#0a1a0f] border-2 border-[#1a3825] w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-[#1a3825]">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-1.5 font-sans">
                <ShieldCheck className="w-4 h-4 text-[#00e56b]" />
                <span>Apply for Identity Verification</span>
              </h3>
              <button 
                onClick={() => setVerificationModalOpen(false)}
                className="text-xs text-[#5a8a6a] hover:text-[#e8f5ee] bg-[#050e08]/90 px-2.5 py-1 border border-[#1a3825] rounded-xl font-bold"
              >
                Dismiss
              </button>
            </div>

            <p className="text-[11px] text-[#a0c5ac] leading-relaxed select-none">
              A Verified Status enhances transparency and elevates grassroots discoveries without overriding individual talent. Established scout affiliations, recognized journalists, and community mentors must complete this registration.
            </p>

            <form onSubmit={(e) => {
              e.preventDefault();
              submitVerificationApplication({
                role: vRole === "scout" ? "professional" : "community",
                organisation: vOrg,
                socialLinks: "",
                description: vDesc,
                reason: vReason,
              });
              showToast("Verification application submitted ✦", "success");
              setVerificationModalOpen(false);
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] uppercase font-bold text-[#5a8a6a] mb-1">Affiliation Role</label>
                  <select 
                    value={vRole}
                    onChange={(e) => setVRole(e.target.value)}
                    className="w-full bg-[#050e08] border border-[#1a3825] text-white p-2 text-xs rounded-xl"
                  >
                    <option value="scout">⚽ Official Scout / Pro Club Agent</option>
                    <option value="creator">🎙️ Content Creator / Journalist</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold text-[#5a8a6a] mb-1">Company / Organization</label>
                  <input
                    type="text"
                    required
                    value={vOrg}
                    onChange={(e) => setVOrg(e.target.value)}
                    placeholder="e.g. Soweto Times / Mamelodi Dev"
                    className="w-full bg-[#050e08] border border-[#1a3825] text-white p-2 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] uppercase font-bold text-[#5a8a6a] mb-1">Social Validation Profile (LinkedIn / Twitter)</label>
                <input
                  type="url"
                  required
                  value={vSocials}
                  onChange={(e) => setVSocials(e.target.value)}
                  placeholder="https://linkedin.com/in/username"
                  className="w-full bg-[#050e08] border border-[#1a3825] text-white p-2 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] uppercase font-bold text-[#5a8a6a] mb-1">Aspirations & Purpose for South African Football</label>
                <textarea
                  required
                  rows={2}
                  value={vReason}
                  onChange={(e) => setVReason(e.target.value)}
                  placeholder="How will your verified status impact and promote the 17-year-old grassroots kids from Khayelitsha, Mitchells Plain, or Soweto?"
                  className="w-full bg-[#050e08] border border-[#1a3825] text-white p-2.5 text-xs rounded-xl resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#00e56b] text-[#050e08] py-3 rounded-xl text-xs font-black uppercase tracking-wider hover:brightness-105 transition"
              >
                🚀 Queue Verification Application Request
              </button>
            </form>
          </div>
        </div>
      )}

      {activeHighlightMomentId && (
        <StoryViewer
          userId={clubUser.userId}
          isHighlightMode={true}
          highlightMomentId={activeHighlightMomentId}
          onClose={() => setActiveHighlightMomentId(null)}
        />
      )}

      {createHighlightOpen && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-[#050e08] border border-[#1a3825] rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-[#1a3825]/40">
              <h3 className="text-base font-bold font-bebas text-white uppercase tracking-wider flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-[#f5c518]" />
                <span>COMPILE EXCLUSIVE PROFILE MOMENT REEL</span>
              </h3>
              <button 
                onClick={() => setCreateHighlightOpen(false)} 
                className="p-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateHighlightSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-mono text-[#5a8a6a] font-bold mb-1.5">Highlight Reel Title (Max 12 chars)</label>
                <input
                  type="text"
                  required
                  maxLength={12}
                  placeholder="e.g. Best Goals"
                  value={newHighlightTitle}
                  onChange={(e) => setNewHighlightTitle(e.target.value)}
                  className="w-full bg-[#0a140d] text-[#e8f5ee] border border-[#1a3825] rounded-xl px-3 py-2.5 text-xs focus:border-[#00e56b] outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono text-[#5a8a6a] font-bold mb-1.5">Custom Cover Image URL</label>
                <input
                  type="url"
                  placeholder="Leave empty for default dynamic cover"
                  value={newHighlightCoverUrl}
                  onChange={(e) => setNewHighlightCoverUrl(e.target.value)}
                  className="w-full bg-[#0a140d] text-[#e8f5ee] border border-[#1a3825] rounded-xl px-3 py-2.5 text-xs focus:border-[#00e56b] outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono text-[#5a8a6a] font-bold mb-1.5">
                  Select Clips to Bundle:
                </label>
                {posts.filter(p => p.userId === currentUser.userId).length === 0 ? (
                  <p className="text-[10px] italic text-[#5a8a6a] bg-black/40 border border-[#1a3825]/30 p-3 rounded-lg">
                    No feed uploads found. Try uploading a clip first to compile highlight moments!
                  </p>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-2 no-scrollbar">
                    {posts.filter(p => p.userId === currentUser.userId).map(p => {
                      const isSelected = newHighlightSelectedPostIds.includes(p.postId);
                      return (
                        <button
                          key={p.postId}
                          type="button"
                          onClick={() => {
                            setNewHighlightSelectedPostIds(prev => 
                              isSelected 
                                ? prev.filter(id => id !== p.postId) 
                                : [...prev, p.postId]
                            );
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-lg border text-left text-[11px] transition ${
                            isSelected 
                              ? "bg-[#122b19]/40 border-[#00e56b] text-white" 
                              : "bg-black/25 border-[#1a3825]/45 text-[#5a8a6a]"
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <img src={p.thumbnailUrl} alt="prev" className="w-6 h-6 object-cover rounded" />
                            <span className="truncate max-w-[200px]">{p.caption}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#00e56b]" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#00e56b] text-[#050e08] font-bold text-xs uppercase tracking-wider rounded-xl hover:brightness-110 transition mt-2"
              >
                ✔ Assemble Moment Collection
              </button>
            </form>
          </div>
        </div>
      )}

      {vaultOpen && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-[#050e08] border border-[#1a3825] rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-2 border-b border-[#1a3825]/40 shrink-0">
              <div className="flex items-center space-x-2">
                <FolderLock className="w-5 h-5 text-[#f5c518]" />
                <div>
                  <h3 className="text-base font-bold font-bebas text-white uppercase tracking-wider">
                    MY PRIVATE SECURE VAULT
                  </h3>
                  <p className="text-[9px] text-[#5a8a6a] font-mono">OWNER DELETED & RETIRED HIGHLIGHT CLIPS</p>
                </div>
              </div>
              <button 
                onClick={() => setVaultOpen(false)} 
                className="p-1 rounded-full bg-[#0a1a0f] border border-[#1a3825] text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#121915]/60 text-[#e8f5ee] p-3 rounded-xl border border-[#1a3825]/30 text-[10.5px] leading-relaxed flex items-start space-x-2.5 shrink-0">
              <span className="text-amber-500 font-bold">🔒 Secure:</span>
              <span>All items inside the Vault are <strong>completely private</strong>. Only you can view archived items. Expired reports disappear permanently after 30 days.</span>
            </div>

            {/* Locked Content List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1 no-scrollbar-x">
              {posts.filter(p => p.userId === currentUser.userId && p.isArchived).length === 0 ? (
                <div className="text-center py-12 text-[#5a8a6a] space-y-2">
                  <Archive className="w-8 h-8 text-[#1a3825] mx-auto" />
                  <p className="text-xs">Your Private Vault is currently empty.</p>
                  <p className="text-[10px] uppercase font-mono max-w-[240px] mx-auto leading-tight">Archive feed clips or moments to safely store them here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5">
                  {posts.filter(p => p.userId === currentUser.userId && p.isArchived).map(p => (
                    <div 
                      key={p.postId}
                      className="bg-[#07130b] border border-[#1a3825] rounded-xl p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <img src={p.thumbnailUrl} alt="Thumbnail" className="w-12 h-12 rounded-lg object-cover border border-[#1a3825]/75" />
                        <div>
                          <span className="block text-xs font-bold text-white uppercase font-sans line-clamp-1">{p.caption}</span>
                          <span className="block text-[9px] text-[#5a8a6a] uppercase font-mono mt-0.5">Archived Archive Clip</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            restorePost(p.postId);
                            showToast("Post restored to your feed ✦", "success");
                          }}
                          className="bg-[#00e56b]/15 hover:bg-[#00e56b]/25 border border-[#00e56b]/30 px-2.5 py-1.5 rounded-lg text-xs text-[#00e56b] font-mono font-bold"
                        >
                          RESTORE
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm("Are you sure you want to delete this archive permanently? This cannot be undone.")) {
                              deletePostPermanently(p.postId);
                              showToast("Post permanently discarded.", "info");
                            }
                          }}
                          className="p-1.5 hover:bg-red-950/40 border border-[#1a3825] text-red-400 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Digital agreement modal controller */}
      <DigitalAgreementModal
        isOpen={agreementOpen}
        onClose={() => setAgreementOpen(false)}
      />

      {followModal && (
        <FollowListModal
          ownerName={clubUser.name}
          followers={clubUser.followers || []}
          following={clubUser.following || []}
          initialTab={followModal}
          allUsers={users}
          onClose={() => setFollowModal(null)}
        />
      )}

    </div>
  );
};
