import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import { PitchReport, CareerMoment, UserProfile } from "../types";
import { X, Play, Pause, Volume2, VolumeX, Send, Trash2, Edit } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface StoryViewerProps {
  userId: string; // The user whose stories we are viewing
  initialReportId?: string;
  isHighlightMode?: boolean; // True if viewing Career Moments (no timers)
  highlightMomentId?: string; // Optional Career Moment ID
  onClose: () => void;
  onRefreshProfile?: () => void;
}

export const StoryViewer: React.FC<StoryViewerProps> = ({
  userId,
  initialReportId,
  isHighlightMode = false,
  highlightMomentId,
  onClose,
  onRefreshProfile
}) => {
  const { 
    pitchReports, 
    careerMoments, 
    users, 
    currentUser, 
    replyToPitchReport, 
    deleteCareerMoment, 
    updateCareerMoment,
    posts
  } = useApp();

  const userProfile = users.find(u => u.userId === userId);
  const isOwnProfile = currentUser?.userId === userId;

  // Find target stories/contents
  const [activeItems, setActiveItems] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showReplyConfirm, setShowReplyConfirm] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const [progress, setProgress] = useState(0);

  // Load appropriate contents
  useEffect(() => {
    if (isHighlightMode && highlightMomentId) {
      // Find Career Moment
      const momentObj = careerMoments.find(m => m.momentId === highlightMomentId);
      if (momentObj) {
        // Map contentIds back to pitch reports or posts
        const items = momentObj.contentIds.map(id => {
          // Look in reports
          const report = pitchReports.find(r => r.reportId === id);
          if (report) return { ...report, id: report.reportId, title: momentObj.title };
          // Look in posts
          const post = posts.find(p => p.postId === id);
          if (post) {
            return {
              id: post.postId,
              mediaUrl: post.videoUrl || post.thumbnailUrl,
              mediaType: post.videoUrl ? "video" : "image",
              textContent: post.caption,
              createdAt: post.timestamp,
              userName: post.playerName,
              userRole: "player" as any,
              title: momentObj.title
            };
          }
          return null;
        }).filter(Boolean);
        setActiveItems(items);
        
        let startIdx = 0;
        if (initialReportId) {
          const idx = items.findIndex(it => it?.id === initialReportId);
          if (idx !== -1) startIdx = idx;
        }
        setCurrentIndex(startIdx);
      }
    } else {
      // Find non-expired Pitch Reports for this user
      const userReports = pitchReports.filter(r => r.userId === userId && new Date(r.expiresAt) > new Date());
      setActiveItems(userReports);
      
      let startIdx = 0;
      if (initialReportId) {
        const idx = userReports.findIndex(r => r.reportId === initialReportId);
        if (idx !== -1) startIdx = idx;
      }
      setCurrentIndex(startIdx);
    }
  }, [userId, initialReportId, isHighlightMode, highlightMomentId, pitchReports, careerMoments, posts]);

  const activeItem = activeItems[currentIndex];

  // Auto-advance logic for standard Pitch Reports (5s)
  useEffect(() => {
    if (activeItems.length === 0 || !activeItem) return;
    if (isHighlightMode) {
      // No timers in highlight moments, stays at 100%
      setProgress(100);
      return;
    }

    setProgress(0);
    if (!isPlaying) {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      return;
    }

    const duration = 5000; // 5 seconds
    const intervalTime = 50;
    const step = (intervalTime / duration) * 100;

    progressIntervalRef.current = window.setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(progressIntervalRef.current!);
          handleNext();
          return 100;
        }
        return p + step;
      });
    }, intervalTime);

    timerRef.current = setTimeout(() => {
      handleNext();
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [currentIndex, isPlaying, activeItems, isHighlightMode]);

  const handleNext = () => {
    if (currentIndex < activeItems.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onClose(); // Close at end of sequence
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleSendReply = () => {
    if (!activeItem || (!replyText.trim() && !selectedReaction)) return;
    
    // Send text comments or emoji reactions
    const content = replyText.trim() || `Reacted with dynamic sticker: ${selectedReaction}`;
    replyToPitchReport(activeItem.reportId || activeItem.id, content, selectedReaction || undefined);
    
    setReplyText("");
    setSelectedReaction(null);
    setShowReplyConfirm(true);
    setTimeout(() => {
      setShowReplyConfirm(false);
    }, 2000);
  };

  const handleQuickReaction = (emoji: string) => {
    setSelectedReaction(emoji);
    // Send instantly
    replyToPitchReport(activeItem.reportId || activeItem.id, `Reacted with: ${emoji}`, emoji);
    setShowReplyConfirm(true);
    setTimeout(() => {
      setShowReplyConfirm(false);
    }, 1500);
  };

  // Drag listeners to simulate swipe down to close
  const touchStartY = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    if (deltaY > 120) {
      onClose(); // Swipe down to close
    }
  };

  if (activeItems.length === 0 || !activeItem) {
    return null;
  }

  // Choose text bg layout
  const getBgStyle = (colorType: string = "pitch_green") => {
    switch (colorType) {
      case "dark_green": return "from-[#051408] to-[#0d2a13]";
      case "pitch_green": return "from-[#0a2312] to-[#124220]";
      case "gold": return "from-[#2b2204] to-[#4c3a03]";
      case "black": return "from-[#010502] to-[#0a140d]";
      default: return "from-[#0a2312] to-[#1a4f2b]";
    }
  };

  const isVideo = activeItem.mediaType === "video" || activeItem.mediaUrl?.endsWith(".mp4");

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 bg-black/98 z-50 flex items-center justify-center backdrop-blur-md"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="w-full max-w-md h-full relative flex flex-col justify-between overflow-hidden shadow-2xl bg-[#030804]">
          
          {/* TOP AREA - Progress bars and user metatags */}
          <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/80 to-transparent p-4 z-30">
            {/* Progress Bars */}
            <div className="flex space-x-1 mb-4">
              {activeItems.map((_, idx) => (
                <div key={idx} className="h-[3px] flex-1 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white transition-all ease-linear"
                    style={{ 
                      width: idx < currentIndex ? "100%" : idx === currentIndex ? `${progress}%` : "0%"
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Profile Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-[#0a140d] border border-[#00e56b] flex items-center justify-center text-lg">
                  {userProfile?.name?.includes("Sipho") ? "⚽" : userProfile?.name?.includes("Thabo") ? "⚡" : "🥅"}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white leading-tight">
                    {userProfile?.name || activeItem.userName}
                  </h4>
                  <p className="text-[10px] text-[#5a8a6a] font-mono uppercase">
                    {isHighlightMode ? activeItem.title : "Story Posted"}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {isVideo && (
                  <button 
                    onClick={() => setIsMuted(!isMuted)} 
                    className="text-white hover:text-[#00e56b] p-1.5 transition"
                  >
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                )}
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="text-white hover:text-[#00e56b] p-1.5 transition text-xs font-mono px-2 bg-black/40 rounded border border-white/10"
                >
                  {isHighlightMode ? "Moment" : isPlaying ? "PAUSE" : "PLAY"}
                </button>
                <button 
                  onClick={onClose} 
                  className="text-white hover:text-red-500 p-1.5 transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>

          {/* MAIN CONTENT AREA - Tap navigation overlay */}
          <div className="flex-1 w-full relative flex items-center justify-center">
            {/* Left Tap Detector */}
            <div 
              className="absolute left-0 top-20 bottom-24 w-1/4 z-20 cursor-pointer" 
              onClick={handlePrev}
            />
            {/* Right Tap Detector */}
            <div 
              className="absolute right-0 top-20 bottom-24 w-1/4 z-20 cursor-pointer" 
              onClick={handleNext}
            />

            {/* Simulated Long press space - to pause story */}
            <div 
              className="absolute inset-x-1/4 top-20 bottom-24 z-10"
              onMouseDown={() => { if(!isHighlightMode) setIsPlaying(false); }}
              onMouseUp={() => { if(!isHighlightMode) setIsPlaying(true); }}
              onTouchStart={() => { if(!isHighlightMode) setIsPlaying(false); }}
              onTouchEnd={() => { if(!isHighlightMode) setIsPlaying(true); }}
            />

            {/* Media wrapper */}
            <div className="w-full h-full flex items-center justify-center">
              {activeItem.mediaType === "text" || !activeItem.mediaUrl ? (
                <div className={`w-full h-full bg-gradient-to-br ${getBgStyle(activeItem.backgroundColour)} flex items-center justify-center px-8 text-center`}>
                  <p className="text-2xl font-bold font-sans text-white leading-relaxed tracking-wide drop-shadow-md">
                    {activeItem.textContent || activeItem.caption}
                  </p>
                </div>
              ) : isVideo ? (
                <video
                  src={activeItem.mediaUrl}
                  autoPlay={isPlaying}
                  muted={isMuted}
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full relative">
                  <img
                    src={activeItem.mediaUrl}
                    alt="Story content"
                    className="w-full h-full object-cover"
                  />
                  {activeItem.textContent && (
                    <div className="absolute inset-x-0 bottom-32 bg-black/60 py-4 px-6 text-center backdrop-blur-xs">
                      <p className="text-white text-base font-medium">{activeItem.textContent}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* BOTTOM INTERACTIVE AREA */}
          <div className="bg-gradient-to-t from-black via-black/95 to-transparent p-5 z-30 pt-10">
            {/* Quick reaction Emojis Row (except self viewing own report) */}
            {!isOwnProfile && (
              <div className="flex justify-between items-center px-4 mb-4">
                {["⚽", "🔥", "⭐", "💪", "👀"].map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleQuickReaction(emoji)}
                    className="text-2xl hover:scale-135 transform transition duration-200 p-2 text-center"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {/* Message Bar or own viewer analytics */}
            {!isOwnProfile ? (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder={`Reply to ${userProfile?.name?.split(" ")[0]}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 bg-[#122316]/80 text-[#e8f5ee] placeholder-[#5a8a6a] border border-[#1a3825] rounded-xl px-4 py-3 text-xs font-sans focus:outline-none focus:border-[#00e56b] transition"
                  onFocus={() => setIsPlaying(false)}
                  onBlur={() => { if(!isHighlightMode) setIsPlaying(true); }}
                  onKeyDown={(e) => { if(e.key === "Enter") handleSendReply(); }}
                />
                <button 
                  onClick={handleSendReply}
                  className="p-3 bg-[#00e56b] text-[#050e08] rounded-xl font-bold hover:bg-[#00cc5f] transition hover:scale-105 active:scale-95"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex justify-between items-center py-2 text-xs border-t border-[#1a3825]/45 pt-4">
                <span className="text-[#5a8a6a] font-mono">
                  👁️ {activeItem.viewCount || Math.floor(Math.random() * 20) + 12} Views
                </span>
                {isHighlightMode && (
                  <span className="text-[#00e56b] font-mono font-bold uppercase tracking-wider">
                    ★ Saved Highlight
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Float success confirm */}
          <AnimatePresence>
            {showReplyConfirm && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="absolute inset-x-6 top-32 bg-[#00e56b]/95 text-[#050e08] text-center py-3.5 px-4 rounded-xl font-sans font-bold z-50 text-xs shadow-lg flex items-center justify-center space-x-1.5"
              >
                <span>✧ Reply Delivered to {userProfile?.name?.split(" ")[0]}!</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
