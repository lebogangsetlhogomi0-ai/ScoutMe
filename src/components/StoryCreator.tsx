import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { X, Check, Eye, Heart, Shield, Plus, Sparkles, Smile } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface StoryCreatorProps {
  onClose: () => void;
}

const REPORT_TYPES = [
  { id: "match", title: "⚽ MATCH DAY", desc: "What happened on the pitch today" },
  { id: "training", title: "⚡ TRAINING CLIP", desc: "Show off physical, stamina or drill work" },
  { id: "skill", title: "🔥 SKILL FLASH", desc: "Amazing trick or fast dribble flash" },
  { id: "announce", title: "📢 ANNOUNCEMENT", desc: "Important news or text updates" },
  { id: "bts", title: "💎 BEHIND SCENES", desc: "Daily life, boots or team bonding clips" }
];

const BACKGROUND_PALETTES = [
  { id: "pitch_green", hex: "#124220", label: "Pitch Green" },
  { id: "dark_green", hex: "#0a1f0f", label: "Dark Forest" },
  { id: "gold", hex: "#4c3a03", label: "Gold Dew" },
  { id: "black", hex: "#050806", label: "Midnight Carbon" }
];

const STICKERS = ["⚽", "🏆", "🥅", "👟", "🔥", "💪", "📍", "🎯", "⭐", "💎", "🦁", "🇿🇦", "🦉"];

export const StoryCreator: React.FC<StoryCreatorProps> = ({ onClose }) => {
  const { addPitchReport, addNewPost, currentUser, addClubPost } = useApp();
  const [step, setStep] = useState(1);

  // Creation State
  const [reportType, setReportType] = useState("match");
  const [contentType, setContentType] = useState<"text" | "media">("text");
  
  // Media asset simulation
  const [simulatedMediaUrl, setSimulatedMediaUrl] = useState("");
  const [simulatedMediaType, setSimulatedMediaType] = useState<"image" | "video">("image");
  
  // Text Report Settings
  const [textContent, setTextContent] = useState("");
  const [bgStyle, setBgStyle] = useState("pitch_green");
  const [overlayStyle, setOverlayStyle] = useState<"plain" | "outlined" | "green_fill" | "gold_fill">("plain");
  
  // Stickers added state
  const [placedStickers, setPlacedStickers] = useState<{ id: string; emoji: string; x: number; y: number }[]>([]);
  const [showStickersPanel, setShowStickersPanel] = useState(false);

  // Audience & Feed Post Toggle
  const [audience, setAudience] = useState<"everyone" | "mysquad" | "scouts">("everyone");
  const [alsoPostToFeed, setAlsoPostToFeed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleMediaPick = (type: "image" | "video", url: string) => {
    setSimulatedMediaUrl(url);
    setSimulatedMediaType(type);
    setContentType("media");
    setStep(2);
  };

  const handleChoosePlaceholder = (category: string) => {
    // Elegant sport imagery fallback for simulation
    const images: Record<string, string> = {
      match: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=cover&q=60",
      training: "https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=800&auto=format&fit=cover&q=60",
      skill: "https://images.unsplash.com/photo-1543351611-58f69d7c1781?w=800&auto=format&fit=cover&q=60",
      bts: "https://images.unsplash.com/photo-1516259762381-22954d7d3ad2?w=800&auto=format&fit=cover&q=60"
    };
    handleMediaPick("image", images[category] || images.match);
  };

  const addStickerToBoard = (emoji: string) => {
    setPlacedStickers([
      ...placedStickers,
      {
        id: `sticker_${Date.now()}`,
        emoji,
        x: Math.floor(Math.random() * 60) + 20, // offset positions
        y: Math.floor(Math.random() * 60) + 20
      }
    ]);
    setShowStickersPanel(false);
  };

  const removeSticker = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPlacedStickers(placedStickers.filter(s => s.id !== id));
  };

  const handlePostReport = async () => {
    if (contentType === "text" && !textContent.trim()) return;
    setIsSubmitting(true);

    try {
      // Assemble pitch report
      const repData = {
        mediaType: contentType === "text" ? "text" : simulatedMediaType,
        mediaUrl: contentType === "media" ? simulatedMediaUrl : "",
        textContent: textContent,
        backgroundColour: bgStyle,
        audience: audience,
        expiresAt: new Date(Date.now() + 24 * 3600000).toISOString(), // exactly 24 hours
        savedToMoments: false
      };

      await addPitchReport(repData);

      // Optional Main Feed sync
      if (alsoPostToFeed && currentUser) {
        const captionWithStickers = `${textContent} ${placedStickers.map(s => s.emoji).join(" ")}`;
        
        if (currentUser.role === "club" || currentUser.accountType === "club") {
          // If club, sync to ClubPosts
          await addClubPost({
            postType: "matchday",
            mediaUrl: contentType === "media" ? simulatedMediaUrl : "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800",
            mediaType: "image",
            caption: captionWithStickers || "New Club updates! #PitchReport",
            likes: 0,
            comments: 0,
            pinned: false
          });
        } else {
          // If player, sync as PostHighlight "training"
          await addNewPost({
            playerName: currentUser.name,
            position: currentUser.position || "CAM",
            club: currentUser.club || "Unattached",
            province: currentUser.province,
            videoUrl: simulatedMediaType === "video" ? simulatedMediaUrl : "",
            thumbnailUrl: simulatedMediaUrl || "https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=800",
            caption: captionWithStickers || "My training moment! #PitchStory",
            tags: [],
            contentType: "training",
            votes: 0,
            views: 1,
            commentsCount: 0,
            postFormat: simulatedMediaType === "video" ? "clip" : "shot"
          });
        }
      }

      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTextStyleClasses = () => {
    switch (overlayStyle) {
      case "outlined":
        return "text-white select-none pointer-events-none drop-shadow-[0_2px_2px_rgba(0,0,0,0.9)] stroke-black font-extrabold text-3xl font-bebas filter";
      case "green_fill":
        return "bg-[#00e56b] text-[#050e08] font-bold py-2.5 px-4 rounded-lg text-2xl shadow-md";
      case "gold_fill":
        return "bg-[#f5c518] text-[#050e08] font-bold py-2.5 px-4 rounded-lg text-2xl shadow-md";
      default:
        return "text-white text-3xl font-extrabold tracking-wide drop-shadow-md";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center backdrop-blur-md overflow-y-auto px-4 py-6">
      <div className="bg-[#050e08] border border-[#1a3825] rounded-3xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl relative">
        
        {/* HEADER */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-[#1a3825]/45 bg-[#050e08]">
          <div>
            <h3 className="text-lg font-bebas font-extrabold tracking-wider text-white">
              CREATE PITCH REPORT <span className="text-[#00e56b]">◉</span>
            </h3>
            <p className="text-[10px] text-[#5a8a6a] uppercase font-mono font-bold">
              Step {step} of 4: {step === 1 ? "Choose Style" : step === 2 ? "Design & Text" : step === 3 ? "Select Audience" : "Post Report"}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-full bg-[#0a1a0f] border border-[#1a3825] text-[#5a8a6a] hover:text-white hover:border-red-500 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTAINER SWITCHES */}
        <div className="p-5 flex-1 min-h-[460px] flex flex-col justify-between">
          
          {/* STEP 1: REPORT TYPES & INITIAL INPUT */}
          {step === 1 && (
            <div className="space-y-4">
              <h4 className="text-xs text-[#5a8a6a] uppercase font-mono tracking-wider font-extrabold mb-1">
                Select your Pitch Category:
              </h4>
              <div className="grid grid-cols-1 gap-2.5">
                {REPORT_TYPES.map(type => (
                  <button
                    key={type.id}
                    onClick={() => {
                      setReportType(type.id);
                      // Set default text for match day / training announcements
                      if (type.id === "announce") {
                        setTextContent("🔥 SQUAD CONTRACT PENDING... Let's stay hungry! 👀");
                      } else {
                        setTextContent("");
                      }
                    }}
                    className={`flex items-start p-3 rounded-2xl border text-left transition duration-200 ${
                      reportType === type.id 
                        ? "bg-[#122b19]/65 border-[#00e56b] shadow-md shadow-[#00e56b]/10" 
                        : "bg-[#07130b] border-[#1a3825]/60 hover:border-[#5a8a6a]/40"
                    }`}
                  >
                    <div className="mr-3 mt-1 text-center bg-[#0d2114] p-1.5 rounded-lg border border-[#1a3825]/30">
                      {reportType === type.id ? <Check className="w-4 h-4 text-[#00e56b]" /> : <div className="w-4 h-4" />}
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-[#e8f5ee] font-sans">{type.title}</span>
                      <span className="block text-[10px] text-[#5a8a6a] mt-0.5 leading-tight font-medium uppercase">{type.desc}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* MEDIA CAPTURE OR TEXT ONLY SELECTOR */}
              <div className="pt-4 border-t border-[#1a3825]/35 grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setContentType("text");
                    setStep(2);
                  }}
                  className="p-4 bg-[#0e1f13] border border-[#1a3825] rounded-2xl text-[#00e56b] hover:bg-[#122b19]/40 hover:border-[#00e56b]/40 text-center transition"
                >
                  <Sparkles className="w-5 h-5 mx-auto mb-1.5 text-[#f5c518]" />
                  <span className="block text-xs font-bold">Text Story</span>
                  <span className="block text-[9px] text-[#5a8a6a] uppercase mt-0.5">Use palettes</span>
                </button>
                <button
                  onClick={() => handleChoosePlaceholder(reportType)}
                  className="p-4 bg-[#0a140d]/80 border border-[#1a3825] rounded-2xl text-[#00e56b] hover:bg-[#122b19]/40 hover:border-[#00e56b]/40 text-center transition"
                >
                  <Plus className="w-5 h-5 mx-auto mb-1.5 text-white" />
                  <span className="block text-xs font-bold">Simulate Photo</span>
                  <span className="block text-[9px] text-[#5a8a6a] uppercase mt-0.5">Import media</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: STYLING & MEDIA/TEXT PREVIEW SCREEN */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#5a8a6a] font-mono uppercase font-bold">Preview Storyboard:</span>
                <span className="text-[10px] text-red-500 font-bold bg-red-500/10 px-2 py-0.5 rounded-full uppercase border border-red-500/15">
                  ✦ Live Customizer
                </span>
              </div>

              {/* STORY EDITOR VIEWBOARD */}
              <div 
                className={`w-full aspect-[4/5] rounded-2xl overflow-hidden relative shadow-inner border border-[#1a3825]/60 flex flex-col items-center justify-center ${
                  contentType === "text" 
                    ? `bg-gradient-to-br ${
                        bgStyle === "pitch_green" ? "from-[#124220] to-[#0a2312]" :
                        bgStyle === "dark_green" ? "from-[#0a1f0f] to-[#050e08]" :
                        bgStyle === "gold" ? "from-[#4c3a03] to-[#251d02]" :
                        "from-[#050806] to-[#010302]"
                      }` 
                    : "bg-black"
                }`}
              >
                {/* Simulated Media asset */}
                {contentType === "media" && (
                  <img src={simulatedMediaUrl} alt="simmed media" className="absolute inset-0 w-full h-full object-cover" />
                )}

                {/* Placed Stickers inside board */}
                {placedStickers.map(sticker => (
                <div
                  key={sticker.id}
                  className="absolute p-2 select-none group text-3xl flex items-center justify-center cursor-move"
                  style={{ left: `${sticker.x}%`, top: `${sticker.y}%` }}
                >
                  <span>{sticker.emoji}</span>
                  <button
                    onClick={(e) => removeSticker(sticker.id, e)}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center text-[8px] border border-white"
                  >
                    ×
                  </button>
                </div>
              ))}

                {/* Styled Text Overlay */}
                <div className="px-6 flex items-center justify-center text-center max-w-full z-10 select-none">
                  <span className={getTextStyleClasses()}>
                    {textContent || <span className="text-white/40 italic text-sm uppercase">Type text below...</span>}
                  </span>
                </div>
              </div>

              {/* INPUT FIELDS / STYLERS */}
              <div className="space-y-3">
                {/* Input Text overlay */}
                <div>
                  <input
                    type="text"
                    placeholder="Type words/announcement here..."
                    maxLength={140}
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    className="w-full bg-[#0a140d]/90 text-sm py-2.5 px-4 rounded-xl border border-[#1a3825] focus:outline-none focus:border-[#00e56b] text-[#e8f5ee] placeholder-[#5a8a6a]"
                  />
                </div>

                {/* Control Toolkits */}
                <div className="flex flex-wrap gap-2.5">
                  {/* Stickers Palette selector */}
                  <div className="relative">
                    <button
                      onClick={() => setShowStickersPanel(!showStickersPanel)}
                      className="text-[11px] font-mono tracking-wider bg-[#0a1a0f] border border-[#1a3825] p-2 rounded-lg text-[#00e56b] flex items-center space-x-1 hover:border-[#00e56b]/40 font-bold"
                    >
                      <Smile className="w-3.5 h-3.5" />
                      <span>✨ STICKERS</span>
                    </button>

                    {showStickersPanel && (
                      <div className="absolute left-0 bottom-10 bg-[#07130b] border border-[#1a3825] rounded-xl p-3 grid grid-cols-5 gap-1.5 w-48 shadow-2xl z-50">
                        {STICKERS.map(st => (
                          <button
                            key={st}
                            onClick={() => addStickerToBoard(st)}
                            className="text-lg hover:scale-130 active:scale-95 transition"
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Themes palette for TEXT MODE only */}
                  {contentType === "text" && (
                    <div className="flex space-x-1.5 items-center">
                      <span className="text-[10px] text-[#5a8a6a] font-mono mr-1">THEME:</span>
                      {BACKGROUND_PALETTES.map(p => (
                        <button
                          key={p.id}
                          onClick={() => setBgStyle(p.id)}
                          className={`w-5 h-5 rounded-full border transition-all ${
                            bgStyle === p.id ? "scale-125 border-[#00e56b]" : "border-white/10"
                          }`}
                          style={{ backgroundColor: p.hex }}
                          title={p.label}
                        />
                      ))}
                    </div>
                  )}

                  {/* Overlays styling toggles */}
                  <div className="flex space-x-1 items-center bg-[#07130b] p-1 border border-[#1a3825] rounded-lg">
                    {(["plain", "outlined", "green_fill", "gold_fill"] as const).map(style => (
                      <button
                        key={style}
                        onClick={() => setOverlayStyle(style)}
                        className={`text-[9px] font-mono px-2 py-1 rounded transition uppercase ${
                          overlayStyle === style ? "bg-[#00e56b] text-[#050e08] font-bold" : "text-[#5a8a6a] hover:text-[#e8f5ee]"
                        }`}
                      >
                        {style.split("_")[0]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 & 4: AUDIENCE OPTIONS & ALSO-POST CONFIG */}
          {step >= 3 && (
            <div className="space-y-5">
              <div className="bg-[#07130b] p-4.5 rounded-2xl border border-[#1a3825]/45 space-y-4">
                <h4 className="text-xs text-[#00e56b] uppercase font-mono tracking-wider font-extrabold flex items-center space-x-1.5">
                  <Shield className="w-4 h-4" />
                  <span>Choose Audience Profile:</span>
                </h4>

                <div className="space-y-2">
                  <button
                    onClick={() => setAudience("everyone")}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition ${
                      audience === "everyone" 
                        ? "bg-[#122b19]/45 border-[#00e56b]" 
                        : "bg-transparent border-[#1a3825]/30"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Eye className="w-4 h-4 text-[#00e56b]" />
                      <div>
                        <span className="block text-xs font-bold text-white font-sans">EVERYONE - PUBLIC</span>
                        <span className="block text-[9px] text-[#5a8a6a] mt-0.5 font-medium uppercase font-sans">Visible to all registered platform scouts and players</span>
                      </div>
                    </div>
                    {audience === "everyone" && <Check className="w-4 h-4 text-[#00e56b] stroke-[3]" />}
                  </button>

                  <button
                    onClick={() => setAudience("mysquad")}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition ${
                      audience === "mysquad" 
                        ? "bg-[#122b19]/45 border-[#00e56b]" 
                        : "bg-transparent border-[#1a3825]/30"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Heart className="w-4 h-4 text-[#00e56b]" />
                      <div>
                        <span className="block text-xs font-bold text-white font-sans">MY SQUAD (MUTUALS ONLY)</span>
                        <span className="block text-[9px] text-[#5a8a6a] mt-0.5 font-medium uppercase font-sans">Close friends squad list mutual followers only</span>
                      </div>
                    </div>
                    {audience === "mysquad" && <Check className="w-4 h-4 text-[#00e56b] stroke-[3]" />}
                  </button>

                  <button
                    onClick={() => setAudience("scouts")}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition ${
                      audience === "scouts" 
                        ? "bg-[#122b19]/45 border-[#00e56b]" 
                        : "bg-transparent border-[#1a3825]/30"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Shield className="w-4 h-4 text-[#f5c518]" />
                      <div>
                        <span className="block text-xs font-bold text-white font-sans">SCOUTS ONLY</span>
                        <span className="block text-[9px] text-[#5a8a6a] mt-0.5 font-medium uppercase font-sans">Only verified Club executives and professional Scouts can observe</span>
                      </div>
                    </div>
                    {audience === "scouts" && <Check className="w-4 h-4 text-[#f5c518] stroke-[3]" />}
                  </button>
                </div>
              </div>

              {/* Also post to main Digital Pitch feed toggle */}
              <div className="bg-[#050e08] p-4.5 rounded-2xl border border-[#1a3825]/70 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Also share to main feed?</span>
                  <span className="text-[10px] uppercase text-[#5a8a6a] font-mono leading-none mt-1 block">
                    Will submit as a Pitch Clip or Match Shot
                  </span>
                </div>
                <button
                  onClick={() => setAlsoPostToFeed(!alsoPostToFeed)}
                  className={`w-11 h-6 rounded-full transition duration-300 flex items-center p-1 cursor-pointer ${
                    alsoPostToFeed ? "bg-[#00e56b]" : "bg-zinc-800"
                  }`}
                >
                  <div 
                    className={`w-4 h-4 rounded-full bg-white transition-all transform ${
                      alsoPostToFeed ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* ACTION BUTTON PANEL */}
          <div className="flex items-center space-x-3 mt-6 border-t border-[#1a3825]/45 pt-5">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(prev => prev - 1)}
                className="flex-1 bg-[#0a1a0f] border border-[#1a3825] hover:border-[#5a8a6a]/40 text-[#5a8a6a] hover:text-white font-mono font-bold py-3 px-4 rounded-2xl transition duration-200 text-xs"
              >
                ← BACK
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 2 && contentType === "text" && !textContent.trim()) return;
                  setStep(prev => prev + 1);
                }}
                disabled={step === 2 && contentType === "text" && !textContent.trim()}
                className={`flex-2 font-mono font-bold py-3 px-4 rounded-2xl transition duration-200 text-xs text-center border ${
                  step === 2 && contentType === "text" && !textContent.trim()
                    ? "bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed"
                    : "bg-[#00e56b] text-[#050e08] hover:bg-[#00cc5f] hover:scale-101 hover:border-[#00e56b]"
                }`}
              >
                CONTINUE →
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePostReport}
                disabled={isSubmitting}
                className="flex-2 bg-[#00e56b] hover:bg-[#00cc5f] text-[#050e08] hover:scale-[1.01] hover:shadow-md border border-[#00e56b] font-mono font-extrabold py-3.5 px-4 rounded-2xl transition duration-200 text-xs text-center flex items-center justify-center space-x-1.5"
              >
                <span>🚀 POST TO PITCH REPORT</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
