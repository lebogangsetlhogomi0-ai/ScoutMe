import React, { useState, useRef } from "react";
import { useApp } from "../context/AppContext";
import { PostHighlight, UserProfile, ChallengePost, ChallengeResponse, SpotlightPost } from "../types";
import { 
  Triangle, MessageSquare, Bookmark, Share2, 
  Play, Pause, VolumeX, Volume2, Maximize, 
  MoreVertical, Plus, Trophy, Award, Landmark, CornerDownRight, Archive, Sparkles, AlertTriangle,
  User, Eye, Send, CheckCircle2, Shield, Gem, Compass, Upload, Zap, Calendar, Heart
} from "lucide-react";
import { CommunityRating } from "../components/CommunityRating";
import { StoryCreator } from "../components/StoryCreator";
import { StoryViewer } from "../components/StoryViewer";
import { useToast } from "../components/Toast";

interface DigitalPitchFeedProps {
  onSuggestUpload: () => void;
  onOpenPlayerProfile: (playerId: string) => void;
  onTriggerScoutAI: (playerId: string) => void;
}

export const DigitalPitchFeed: React.FC<DigitalPitchFeedProps> = ({ 
  onSuggestUpload, 
  onOpenPlayerProfile,
  onTriggerScoutAI
}) => {
  const { 
    posts, 
    users, 
    currentUser, 
    votePost, 
    addComment, 
    toggleShortlist, 
    shortlist, 
    pitchReports, 
    archivePost,
    challengePosts,
    challengeResponses,
    spotlightPosts,
    addChallengePost,
    submitChallengeResponse,
    voteChallengeResponse,
    awardScoutStamp,
    addClinicUpload
  } = useApp();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<"talent" | "community">("talent");
  const [votedPosts, setVotedPosts] = useState<string[]>([]);
  const [activeMenuPostId, setActiveMenuPostId] = useState<string | null>(null);
  
  // Audio & playing state
  const [mutedVideos, setMutedVideos] = useState<Record<string, boolean>>({});
  const [playingPostId, setPlayingPostId] = useState<string | null>(null);
  const [commentsExpanded, setCommentsExpanded] = useState<Record<string, boolean>>({});
  const [newCommentTexts, setNewCommentTexts] = useState<Record<string, string>>({});

  // Story overlays state
  const [createStoryOpen, setCreateStoryOpen] = useState(false);
  const [activeStoryUserId, setActiveStoryUserId] = useState<string | null>(null);

  // Active Challenge Responses modal or state
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
  const [submittingResponse, setSubmittingResponse] = useState(false);
  const [challengeCaption, setChallengeCaption] = useState("");
  const [challengeMedia, setChallengeMedia] = useState("");

  // Video Refs
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  const handlePlayPause = (postId: string) => {
    const video = videoRefs.current[postId];
    if (video) {
      if (video.paused) {
        // Pause others
        Object.keys(videoRefs.current).forEach(id => {
          if (id !== postId && videoRefs.current[id]) {
            videoRefs.current[id]?.pause();
          }
        });
        video.play().catch(err => console.log("Video play interrupted", err));
        setPlayingPostId(postId);
      } else {
        video.pause();
        if (playingPostId === postId) {
          setPlayingPostId(null);
        }
      }
    }
  };

  const handleToggleMute = (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRefs.current[postId];
    if (video) {
      const currentMuted = !video.muted;
      video.muted = currentMuted;
      setMutedVideos(prev => ({ ...prev, [postId]: currentMuted }));
    }
  };

  const handleVote = (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!votedPosts.includes(postId)) {
      votePost(postId);
      setVotedPosts(prev => [...prev, postId]);
    }
  };

  const handleSave = (postId: string, p: PostHighlight, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetPlayer = users.find(u => u.name === p.playerName);
    if (targetPlayer) {
      toggleShortlist(targetPlayer.userId);
    }
  };

  const handlePostCommentSubmit = (postId: string, e: React.FormEvent) => {
    e.preventDefault();
    const commentText = newCommentTexts[postId];
    if (!commentText || !commentText.trim()) return;
    addComment(postId, commentText);
    setNewCommentTexts(prev => ({ ...prev, [postId]: "" }));
  };

  const getStoryEmoji = (name: string) => {
    if (name.includes("Sipho")) return "⚽";
    if (name.includes("Thabo")) return "⚡";
    if (name.includes("Kagiso")) return "🥅";
    if (name.includes("Bongani")) return "🧤";
    if (name.includes("Ayanda")) return "💎";
    return "🏃🏾‍♂️";
  };

  const handleChallengeResponseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChallengeId) return;
    await submitChallengeResponse(selectedChallengeId, challengeCaption, challengeMedia);
    setChallengeCaption("");
    setChallengeMedia("");
    setSelectedChallengeId(null);
    setSubmittingResponse(false);
  };

  // Filter posts based on Grassroots (Tier 1) Players
  // Grassroots Player is tier="player" or missing tier (all seed players default to this)
  const talentPosts = posts.filter(post => {
    const playerObj = users.find(u => u.name === post.playerName || u.userId === post.userId);
    return !playerObj || playerObj.tier === "player" || !playerObj.tier;
  });

  return (
    <div id="digital_pitch_feed_container" className="flex-1 pb-24 overflow-y-auto w-full no-scrollbar px-3 space-y-6">
      
      {/* 1. HORIZONTAL STORIES ROW */}
      <div className="py-2.5 overflow-x-auto no-scrollbar flex items-center space-x-4 border-b border-[#1a3825]/45 mb-1 bg-[#050e08]/90">
        <button 
          id="pitch_your_story"
          onClick={() => setCreateStoryOpen(true)}
          className="flex flex-col items-center space-y-1.5 focus:outline-none min-w-[70px] group"
        >
          <div className="w-[58px] h-[58px] rounded-full bg-[#0a1a0f] border border-dashed border-[#00e56b] flex items-center justify-center relative transition group-hover:scale-105">
            <Plus className="w-5 h-5 text-[#00e56b]" />
            <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#00e56b] flex items-center justify-center border border-[#050e08]">
              <Plus className="w-3 h-3 text-[#050e08] stroke-[3]" />
            </span>
          </div>
          <span className="text-[10px] text-[#e8f5ee] font-sans font-semibold">Your Pitch</span>
        </button>

        {users.filter(u => u.role === "player").map((pl) => {
          const userReports = pitchReports.filter(r => r.userId === pl.userId && new Date(r.expiresAt) > new Date());
          const hasUnexpiredReports = userReports.length > 0;

          return (
            <button
              key={pl.userId}
              id={`story_${pl.userId}`}
              onClick={() => {
                if (hasUnexpiredReports) {
                  setActiveStoryUserId(pl.userId);
                } else {
                  onOpenPlayerProfile(pl.userId);
                }
              }}
              className="flex flex-col items-center space-y-1.5 focus:outline-none min-w-[70px] group"
            >
              <div 
                className={`w-[58px] h-[58px] rounded-full p-[2px] flex items-center justify-center relative overflow-hidden transition duration-300 group-hover:scale-105 ${
                  hasUnexpiredReports 
                    ? "animate-pulse bg-gradient-to-r from-[#00e56b] via-[#f5c518] to-[#00bfff]" 
                    : "bg-[#1a3825]/50 border border-[#1a3825]"
                }`}
              >
                <div className="w-full h-full rounded-full bg-[#020503] flex items-center justify-center">
                  <span className="text-2xl">{getStoryEmoji(pl.name)}</span>
                </div>
                {hasUnexpiredReports && (
                  <span className="absolute -bottom-1 -right-1 bg-[#00e56b] text-[8px] text-[#050e08] uppercase font-mono font-black scale-90 px-1 rounded border border-[#020503]">
                    LIVE
                  </span>
                )}
              </div>
              <span className="text-[10px] text-[#5a8a6a] font-sans font-medium uppercase truncate max-w-[66px]">
                {pl.name.split(" ")[0]}
              </span>
            </button>
          );
        })}
      </div>

      {/* 2. HIGH-CONTRAST NEO-GRASSROOTS TAB SWITCHER */}
      <div className="max-w-xl mx-auto bg-[#0a1a0f]/90 border border-[#1a3825] p-1.5 rounded-2xl flex items-center justify-between">
        <button
          id="tab_talent_feed"
          onClick={() => setActiveTab("talent")}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
            activeTab === "talent"
              ? "bg-[#00e56b] text-[#050e08] shadow-lg"
              : "text-[#5a8a6a] hover:text-[#e8f5ee]"
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Talent Feed ▶</span>
        </button>

        <button
          id="tab_community_feed"
          onClick={() => setActiveTab("community")}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
            activeTab === "community"
              ? "bg-[#f5c518] text-[#050e08] shadow-lg"
              : "text-[#5a8a6a] hover:text-[#e8f5ee]"
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Community ◎</span>
        </button>
      </div>

      {/* 3. CONDITIONAL FEED LAYOUT */}
      <div className="space-y-6 max-w-xl mx-auto">
        
        {activeTab === "talent" ? (
          /* TALENT FEED: Tier 1 grassroots children only */
          talentPosts.length > 0 ? (
            talentPosts.map((post) => {
              const playerObj = users.find(u => u.name === post.playerName || u.userId === post.userId);
              const isVoted = votedPosts.includes(post.postId);
              const isPostShortlisted = shortlist.includes(playerObj?.userId || "");
              const isCommentsOpen = !!commentsExpanded[post.postId];

              // Check if player has an active gold diamond Scout Stamp or a Clinic badge
              const isStamped = playerObj?.endorsed;
              const hasClinicBadge = playerObj?.userId === "player_1"; // Sipho clinic badge
              
              return (
                <div 
                  key={post.postId}
                  className="bg-[#0a1a0f] border border-[#1a3825] rounded-2xl overflow-hidden shadow-xl"
                >
                  {/* Card Header Row */}
                  <div className="p-4 flex items-center justify-between bg-[#06120b]">
                    <div className="flex items-center space-x-3">
                      <button 
                        onClick={() => playerObj && onOpenPlayerProfile(playerObj.userId)}
                        className="w-10 h-10 rounded-full bg-[#050e08] border border-[#1a3825] flex items-center justify-center relative text-lg"
                      >
                        {getStoryEmoji(post.playerName)}
                      </button>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span 
                            onClick={() => playerObj && onOpenPlayerProfile(playerObj.userId)}
                            className="text-white text-sm font-bold font-sans hover:underline cursor-pointer flex items-center"
                          >
                            {post.playerName}
                            {isStamped && (
                              <Gem className="w-3.5 h-3.5 text-[#f5c518] fill-[#f5c518] ml-1" />
                            )}
                          </span>
                          <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase bg-[#0f2318] text-[#00e56b] rounded-md border border-[#1c3e1e]">
                            {post.position}
                          </span>
                          {post.votes > 800 && (
                            <span className="px-1.5 py-0.5 text-[8px] font-black text-[#050e08] bg-[#00e56b] rounded-md uppercase tracking-wider">
                              TRENDING
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#5a8a6a] mt-0.5 flex items-center space-x-2">
                          <span>{playerObj?.club || post.club} · {post.province}</span>
                          {hasClinicBadge && (
                            <span className="inline-flex items-center bg-[#00efff]/10 text-[#00efff] text-[8px] font-black px-1.5 py-0.5 rounded border border-[#00efff]/25">
                              CLINIC APPROVED
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="relative">
                      <button 
                        onClick={() => setActiveMenuPostId(activeMenuPostId === post.postId ? null : post.postId)}
                        className="p-1 text-[#5a8a6a] hover:text-[#00e56b] transition"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>

                      {activeMenuPostId === post.postId && (
                        <div className="absolute right-0 mt-1 w-44 bg-[#0a1a0f] border border-[#1a3825] rounded-xl shadow-2xl z-20 py-1.5 divide-y divide-[#1a3825]/50 animate-in fade-in slide-in-from-top-2 duration-150">
                          <button 
                            onClick={() => {
                              if (playerObj) {
                                toggleShortlist(playerObj.userId);
                              }
                              setActiveMenuPostId(null);
                            }}
                            className="w-full text-left px-4 py-2 text-xs text-[#e8f5ee] hover:bg-[#0f2318] flex items-center space-x-2"
                          >
                            <span>{isPostShortlisted ? "Remove Shortlist" : "Save to Shortlist"}</span>
                          </button>
                          <button 
                            onClick={() => {
                              if (playerObj) onOpenPlayerProfile(playerObj.userId);
                              setActiveMenuPostId(null);
                            }}
                            className="w-full text-left px-4 py-2 text-xs text-[#e8f5ee] hover:bg-[#0f2318]"
                          >
                            View Full Profile
                          </button>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`https://scoutme.org/player/${playerObj?.userId || "1"}`).catch(() => {});
                              showToast("Profile link copied ✦", "success");
                              setActiveMenuPostId(null);
                            }}
                            className="w-full text-left px-4 py-2 text-xs text-[#00e56b] hover:bg-[#0f2318]"
                          >
                            Copy Share Link
                          </button>
                          {currentUser?.tier === "professional" && !isStamped && (
                            <button
                              onClick={() => {
                                if (playerObj) {
                                  awardScoutStamp(playerObj.userId);
                                }
                                setActiveMenuPostId(null);
                              }}
                              className="w-full text-left px-4 py-2 text-xs text-[#f5c518] hover:bg-[#0f2318] flex items-center space-x-1"
                            >
                              <Gem className="w-3 h-3 text-[#f5c518] fill-current" />
                              <span>Award Scout Stamp</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 16:9 Video Player */}
                  <div 
                    className="relative aspect-video bg-[#050e08] overflow-hidden cursor-pointer"
                    onClick={() => handlePlayPause(post.postId)}
                  >
                    <video
                      ref={el => { videoRefs.current[post.postId] = el; }}
                      src={post.videoUrl}
                      loop
                      preload="metadata"
                      playsInline
                      className="w-full h-full object-cover"
                    />

                    {playingPostId !== post.postId && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-2xl transition duration-200 transform active:scale-90">
                          <Play className="w-6 h-6 text-[#050e08] fill-current ml-1" />
                        </div>
                      </div>
                    )}

                    {/* Left overlaid badge */}
                    {isStamped ? (
                      <div className="absolute bottom-3 left-3 bg-[#231e0f]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#f5c518]/50 text-[10px] text-[#f5c518] flex items-center space-x-1.5 font-sans font-bold">
                        <Gem className="w-3 h-3 fill-current" />
                        <span>SCOUT STAMPED GOLD</span>
                      </div>
                    ) : (
                      <div className="absolute bottom-3 left-3 bg-[#050e08]/75 backdrop-blur-md px-2.5 py-1 rounded-lg border border-[#1a3825] text-[10px] text-white flex items-center space-x-1.5 font-sans">
                        <Landmark className="w-3 h-3 text-[#00e56b]" />
                        <span>{post.province} · {post.contentType.toUpperCase()}</span>
                      </div>
                    )}

                  </div>

                  {/* Body Info */}
                  <div className="p-4 space-y-3 bg-[#0a1a0f]">
                    {/* Horizontal Interactive Actions Bar */}
                    <div className="flex items-center justify-between pb-3 border-b border-[#1a3825]/40 select-none">
                      <div className="flex items-center space-x-2.5">
                        {/* Vote Button */}
                        <button 
                          onClick={(e) => handleVote(post.postId, e)}
                          className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl border transition-all ${isVoted ? "bg-[#00e56b] border-[#00e56b] text-[#050e08]" : "bg-[#050e08] border-[#1a3825] text-white hover:text-[#00e56b]"}`}
                        >
                          <Triangle className="w-3.5 h-3.5 fill-current" />
                          <span className="text-[11px] font-mono font-black">{post.votes}</span>
                        </button>

                        {/* Comment Button */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setCommentsExpanded(prev => ({ ...prev, [post.postId]: !isCommentsOpen }));
                          }}
                          className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl border transition-all ${isCommentsOpen ? "bg-[#14341d] border-[#00e56b] text-[#00e56b]" : "bg-[#050e08] border-[#1a3825] text-white hover:text-[#00e56b]"}`}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-mono font-bold">{post.commentsCount}</span>
                        </button>

                        {/* Save Button */}
                        <button 
                          onClick={(e) => handleSave(post.postId, post, e)}
                          className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl border transition-all ${isPostShortlisted ? "bg-[#231e0f] border-[#f5c518] text-[#f5c518]" : "bg-[#050e08] border-[#1a3825] text-white hover:text-[#f5c518]"}`}
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${isPostShortlisted ? "fill-current" : ""}`} />
                          <span className="text-[11px] font-sans font-medium">{isPostShortlisted ? "Saved" : "Save"}</span>
                        </button>

                        {/* Share Button */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const shareUrl = `https://scoutme.org/player/${playerObj?.userId || post.playerId || "player_1"}`;
                            navigator.clipboard.writeText(shareUrl).catch(() => {});
                            showToast("Highlight link copied ✦", "success");
                          }}
                          className="flex items-center space-x-1 px-2.5 py-1.5 bg-[#050e08] border border-[#1a3825] text-white rounded-xl text-[11px] font-sans font-medium hover:text-[#00e56b] hover:border-[#00e56b]/50 transition-all"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Share</span>
                        </button>
                      </div>

                      {(currentUser?.role === "scout" || currentUser?.role === "club") && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (playerObj) onTriggerScoutAI(playerObj.userId);
                          }}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-[#231e0f] border border-[#f5c518]/60 text-[#f5c518] rounded-xl text-xs font-bold uppercase tracking-wide hover:bg-[#f5c518]/10 transition"
                        >
                          <Award className="w-3.5 h-3.5 animate-pulse" />
                          <span>Intel</span>
                        </button>
                      )}
                    </div>

                    <div className="text-xs text-[#5a8a6a] font-mono">
                      ▲ {post.votes.toLocaleString()} votes · {post.views.toLocaleString()} views · {post.comments?.length || 0} comments
                    </div>

                    {playerObj && (
                      <CommunityRating 
                        playerId={playerObj.userId} 
                        isCompact={true} 
                        onCompactTap={() => onOpenPlayerProfile(playerObj.userId)}
                      />
                    )}

                    <p className="text-sm text-white leading-relaxed">
                      <span className="font-bold mr-2 text-[#e8f5ee]">{post.playerName}</span>
                      {post.caption}
                    </p>

                    <div className="flex flex-wrap gap-1.5 focus:outline-none">
                      {post.tags.map(tag => (
                        <span key={tag} className="text-xs text-[#00e56b] hover:underline font-mono">
                          #{tag}
                        </span>
                      ))}
                    </div>

                    {/* SCOUT NEURAL ACTIVER CTA */}
                    {(currentUser?.role === "scout" || currentUser?.role === "club") && (
                      <div 
                        onClick={() => playerObj && onTriggerScoutAI(playerObj.userId)}
                        className="mt-3 bg-[#231e0f] border-l-4 border-[#f5c518] border border-[#38331a] p-3 rounded-r-xl flex items-center justify-between cursor-pointer hover:bg-[#38331a]/40 transition"
                      >
                        <div className="flex items-center space-x-2">
                          <Gem className="w-3.5 h-3.5 text-[#f5c518] fill-current" />
                          <span className="text-xs font-bold font-sans text-[#f5c518] uppercase tracking-wide">
                            Generate Live Neural Intelligence Report
                          </span>
                        </div>
                        <span className="text-xs text-[#f5c518]">→</span>
                      </div>
                    )}

                    {/* Comment Form Expansion */}
                    <div className="pt-2 border-t border-[#1a3825]/45">
                      {!isCommentsOpen ? (
                        <button 
                          onClick={() => setCommentsExpanded(prev => ({ ...prev, [post.postId]: true }))}
                          className="text-xs text-[#5a8a6a] hover:text-[#00e56b]"
                        >
                          View all comments ({post.comments?.length || 0})
                        </button>
                      ) : (
                        <div className="space-y-3 mt-1.5">
                          <div className="flex justify-between items-center pb-1">
                            <span className="text-xs font-bold text-[#e8f5ee]">Comments</span>
                            <button 
                              onClick={() => setCommentsExpanded(prev => ({ ...prev, [post.postId]: false }))}
                              className="text-[10px] text-[#5a8a6a] hover:underline uppercase"
                            >
                              Minimize
                            </button>
                          </div>

                          <div className="space-y-2.5 max-h-48 overflow-y-auto">
                            {post.comments?.map(c => (
                              <div key={c.commentId} className="text-xs flex items-start space-x-2 bg-[#050e08]/40 p-2 rounded-lg">
                                <span className="font-bold text-[#00e56b] min-w-[70px]">{c.userName}:</span>
                                <div className="flex-1">
                                  <p className="text-[#e8f5ee] select-text">{c.text}</p>
                                  <span className="text-[8px] text-[#5a8a6a] block mt-0.5">{c.timestamp}</span>
                                </div>
                              </div>
                            ))}
                          </div>

                          <form onSubmit={(e) => handlePostCommentSubmit(post.postId, e)} className="flex space-x-2">
                            <input
                              type="text"
                              required
                              value={newCommentTexts[post.postId] || ""}
                              onChange={(e) => setNewCommentTexts(prev => ({ ...prev, [post.postId]: e.target.value }))}
                              placeholder="Add a constructive scout analysis..."
                              className="flex-1 bg-[#050e08] border border-[#1a3825] rounded-xl px-3 py-2 text-xs text-white"
                            />
                            <button 
                              type="submit"
                              className="bg-[#00e56b] text-[#050e08] px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wide hover:brightness-105"
                            >
                              Send
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-center text-xs text-[#5a8a6a] italic py-12">No talent footage posted yet. Stay ready!</p>
          )

        ) : (
          /* COMMUNITY FEED (Spotlights & Challenges Created & Clinics Uploaded) */
          <div className="space-y-6">
            
            {/* Create Challenge/Announcement Section (For Verified accounts only) */}
            {(currentUser?.tier === "community" || currentUser?.tier === "professional") && (
              <div className="bg-[#0a2312] border border-[#00e56b]/30 rounded-2xl p-4 space-y-3">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-[#00e56b]" />
                  <span className="text-xs font-bold uppercase text-[#00e56b] tracking-wider">
                    Verified Amplification Tools
                  </span>
                </div>
                <p className="text-xs text-[#a0c5ac]">
                  As a verified platform voice, you represent a gateway of amplification. Create a challenge respond-able directly by grassroots talent!
                </p>
                <div className="flex items-center space-x-2 pt-1.5">
                  <button
                    onClick={() => {
                      const title = prompt("Challenge Title:");
                      const desc = prompt("Challenge Description (Kasi task context):");
                      const hashtag = prompt("Challenge Hashtag (e.g. #SowetoJuggle):");
                      if (title && desc && hashtag) {
                        addChallengePost(title, desc, hashtag);
                      }
                    }}
                    className="flex-1 bg-[#00e56b] text-[#050e08] py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider text-center"
                  >
                    + Create Challenge
                  </button>
                </div>
              </div>
            )}

            {/* SPOTLIGHT POSTINGS SECTION */}
            {spotlightPosts.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase text-[#f5c518] tracking-widest pl-1">
                  🌟 Spotlight Endorsements
                </h3>
                {spotlightPosts.map((spot) => {
                  const featuredProfile = users.find(u => u.userId === spot.featuredPlayerId);
                  
                  return (
                    <div 
                      key={spot.spotlightId} 
                      className="bg-gradient-to-br from-[#0a1a0f] to-[#040f08] border border-[#f5c518]/30 rounded-2xl p-5 shadow-lg relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-[#f5c518]/5 rounded-bl-full pointer-events-none flex items-center justify-center pl-10 pb-10">
                        <Sparkles className="w-5 h-5 text-[#f5c518] opacity-60" />
                      </div>

                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-9 h-9 rounded-full bg-[#1b190f] border border-[#f5c518]/40 flex items-center justify-center text-sm">
                          👨🏾‍💻
                        </div>
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="text-xs font-bold text-white">{spot.creatorName}</span>
                            <span className="w-3.5 h-3.5 rounded-full bg-[#00e56b] inline-flex items-center justify-center text-[8px] text-[#050e08] font-bold">
                              ✓
                            </span>
                          </div>
                          <span className="text-[10px] text-[#5a8a6a] uppercase">{spot.creatorRole}</span>
                        </div>
                      </div>

                      <p className="text-sm text-[#e8f5ee] italic font-sans leading-relaxed border-l-2 border-[#f5c518] pl-3 py-1 mb-4">
                        "{spot.endorsementText}"
                      </p>

                      <div className="bg-[#050e08] p-3.5 rounded-xl border border-[#1a3825] flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-xl">⚽</span>
                          <div>
                            <span className="text-xs text-[#a0c5ac] block font-mono">Spotlight Hero:</span>
                            <span className="text-xs font-bold text-white">{spot.featuredPlayerName}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => onOpenPlayerProfile(spot.featuredPlayerId)}
                          className="bg-[#f5c518] text-[#050e08] py-1.5 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider transition hover:scale-102 flex items-center space-x-1"
                        >
                          <span>Discover {spot.featuredPlayerName.split(" ")[0]}</span>
                          <span className="font-bold">→</span>
                        </button>
                      </div>

                      <div className="mt-3.5 flex items-center justify-between text-[9px] text-[#5a8a6a] font-mono">
                        <span>Endorsement Active ✧ Radar Boosted</span>
                        <span>{spot.createdAt}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ACTIVE CHALLENGE ENTRIES SECTION */}
            {challengePosts.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase text-[#00bfff] tracking-widest pl-1">
                  🏆 Active Kasi Challenges
                </h3>
                {challengePosts.map((chal) => {
                  // Find response for this challenge
                  const responses = challengeResponses.filter(r => r.challengeId === chal.challengeId);
                  
                  return (
                    <div 
                      key={chal.challengeId} 
                      className="bg-[#0a1a0f] border border-[#1a3825] rounded-2xl p-5 space-y-4 shadow"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-lg bg-[#0e273c] flex items-center justify-center text-xs">
                            🏆
                          </div>
                          <div>
                            <span className="text-[10px] text-[#00bfff] uppercase tracking-wider font-extrabold block">
                              CHALLENGE CREATED BY {chal.creatorName.toUpperCase()}
                            </span>
                            <h4 className="text-sm font-bold text-white uppercase tracking-tight antialiased">
                              {chal.title}
                            </h4>
                          </div>
                        </div>
                        <span className="bg-[#0e273c] text-[#00bfff] text-[9px] font-mono font-bold py-1 px-2 rounded-full border border-[#00bfff]/30">
                          {responses.length} responses
                        </span>
                      </div>

                      <p className="text-xs text-[#a0c5ac] leading-relaxed">
                        {chal.description}
                      </p>

                      <div className="bg-[#050e08] p-3 rounded-xl border border-[#1a3825]/45 text-[11px] text-[#00e56b] font-mono">
                        Hashtags to post: <span className="font-bold underline text-white">{chal.hashtag}</span>
                      </div>

                      {/* Display replies responses list to this challenge */}
                      {responses.length > 0 && (
                        <div className="space-y-2.5 border-t border-[#1a3825]/30 pt-3">
                          <h5 className="text-[10px] uppercase font-black tracking-widest text-[#5a8a6a]">
                            Trending Responses
                          </h5>
                          {responses.map((resp) => (
                            <div key={resp.responseId} className="bg-[#06120b] border border-[#1a3825] p-3.5 rounded-xl space-y-3.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm">{resp.playerAvatarEmoji}</span>
                                  <span 
                                    onClick={() => onOpenPlayerProfile(resp.playerId)}
                                    className="text-xs font-bold text-white hover:underline cursor-pointer"
                                  >
                                    {resp.playerName}
                                  </span>
                                </div>
                                <button
                                  onClick={() => voteChallengeResponse(resp.responseId)}
                                  className="flex items-center space-x-1.5 bg-[#0a1a0f] hover:bg-[#15341c] border border-[#1a3825] py-1 px-2.5 rounded-full text-[10px] text-white"
                                >
                                  <Heart className="w-3.5 h-3.5 text-red-500 fill-current" />
                                  <span className="font-mono">{resp.votes} votes</span>
                                </button>
                              </div>

                              <p className="text-xs text-[#dfede5]">
                                {resp.caption}
                              </p>

                              {/* Simulated Video response player banner */}
                              <div className="relative aspect-video rounded-lg overflow-hidden bg-[#050e08] border border-[#1a3825] flex items-center justify-center">
                                <video 
                                  src={resp.mediaUrl}
                                  controls
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute top-2 left-2 bg-black/80 text-[8px] font-mono uppercase font-black text-[#00e56b] px-1.5 py-0.5 rounded">
                                  VALIDATED RESPONSE
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* RESPOND FOOTAGE OPT-IN */}
                      {currentUser?.role === "player" && (
                        <button
                          onClick={() => {
                            setSelectedChallengeId(chal.challengeId);
                            setSubmittingResponse(true);
                          }}
                          className="w-full bg-[#00bfff] hover:bg-[#33c7ff] text-[#050e08] py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center space-x-1.5 shadow"
                        >
                          <Upload className="w-4 h-4 text-[#050e08]" />
                          <span>⚽ Upload Response Footage</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* CLINICS LISTINGS SECTION */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase text-[#00efff] tracking-widest pl-1">
                ⚽ Scout Clinic Audits
              </h3>
              
              <div className="bg-[#0a1a0f] border border-[#1a3825] rounded-2xl p-4 space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 text-[9px] font-bold uppercase bg-[#00efff]/20 text-[#00efff] rounded border border-[#00efff]/30">
                    SOWETO CLINIC DEPLOYED
                  </span>
                  <span className="text-[10px] text-[#5a8a6a] font-mono">By Cellular Maake</span>
                </div>
                <h4 className="text-sm font-bold text-white uppercase tracking-tight">
                  Stars of Africa Soweto Showcase 2026
                </h4>
                <p className="text-xs text-[#a0c5ac] leading-relaxed">
                  Successfully monitored over 45 footballers at Soweto Owls Academy setup. Highlighted outstanding prospects have had validated <b>Clinic Appearance</b> badges embedded in their profile metrics database.
                </p>
                <div className="flex flex-wrap gap-1.5 bg-[#050e08] p-3 rounded-xl border border-[#1a3825]/45">
                  <span className="text-[9px] uppercase font-bold text-[#5a8a6a] block w-full mb-1">
                    Tagged Players (Click to scout):
                  </span>
                  <button 
                    onClick={() => onOpenPlayerProfile("player_1")}
                    className="bg-[#112d1b] hover:bg-[#1a4429] text-xs font-bold text-[#00e56b] py-1 px-3.5 rounded border border-[#00e56b]/30"
                  >
                    Sipho Dlamini (CAM) ✓
                  </button>
                  <button 
                    onClick={() => onOpenPlayerProfile("player_2")}
                    className="bg-[#112d1b] hover:bg-[#1a4429] text-xs font-bold text-[#00e56b] py-1 px-3.5 rounded border border-[#00e56b]/30"
                  >
                    Thabo Nkosi (RW) ✓
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* CHALLENGE FOOTAGE UPLOAD DIALOG OVERLAY */}
      {submittingResponse && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-[#0a1a0f] border border-[#1a3825] w-full max-w-md rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[#1a3825]">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <span>🏆 Upload Challenge Response</span>
              </h3>
              <button 
                onClick={() => setSubmittingResponse(false)}
                className="text-xs text-[#5a8a6a] hover:text-[#e8f5ee]"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleChallengeResponseSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-[#5a8a6a] tracking-wider block">
                  Footage Caption
                </label>
                <input
                  type="text"
                  required
                  value={challengeCaption}
                  onChange={(e) => setChallengeCaption(e.target.value)}
                  placeholder="Kasi control, slick release of first touch..."
                  className="w-full bg-[#050e08] border border-[#1a3825] text-white rounded-xl px-3 py-2.5 text-xs focus:border-[#00e56b] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-[#5a8a6a] tracking-wider block">
                  Media Link (Simulated MP4)
                </label>
                <input
                  type="text"
                  required
                  value={challengeMedia}
                  onChange={(e) => setChallengeMedia(e.target.value)}
                  placeholder="https://assets.mixkit.co/videos/preview/...mp4"
                  className="w-full bg-[#050e08] border border-[#1a3825] text-white rounded-xl px-3 py-2.5 text-xs focus:border-[#00e56b] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#00efff] text-[#050e08] py-3 rounded-xl text-xs font-black uppercase tracking-wider hover:brightness-105"
              >
                ✓ Submit Kasi Entry
              </button>
            </form>
          </div>
        </div>
      )}

      {createStoryOpen && (
        <StoryCreator onClose={() => setCreateStoryOpen(false)} />
      )}

      {activeStoryUserId && (
        <StoryViewer
          userId={activeStoryUserId}
          onClose={() => setActiveStoryUserId(null)}
        />
      )}
    </div>
  );
};
