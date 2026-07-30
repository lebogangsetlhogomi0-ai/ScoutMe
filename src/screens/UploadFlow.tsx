import React, { useState, useRef } from "react";
import { useApp } from "../context/AppContext";
import {
  PlusCircle, Video, Play, CheckCircle,
  MapPin, ShieldCheck, ArrowRight, Eye, Sparkles, X, Scissors, Layers
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { storage, db, isDemoMode } from "../firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

interface UploadFlowProps {
  onUploadSuccess: () => void;
}

export const UploadFlow: React.FC<UploadFlowProps> = ({ onUploadSuccess }) => {
  const { addNewPost, currentUser } = useApp();
  const [step, setStep] = useState(1);
  const [contentType, setContentType] = useState<"highlight" | "match" | "training" | "full" | null>(null);

  // Trim States
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100);

  // Details States
  const [caption, setCaption] = useState("");
  const [selectedPosition, setSelectedPosition] = useState(currentUser?.position || "CAM");
  const [matchContext, setMatchContext] = useState("");
  const [province, setProvince] = useState(currentUser?.province || "Gauteng");
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [visibility, setVisibility] = useState("Public to Platform");

  // Thumbnail selection
  const [selectedThumbnail, setSelectedThumbnail] = useState("⚡ Strike Deflection");

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Seed standard hashtags to click/tap to append
  const hashtagSuggestions = ["ScoutMe", "KasiFootball", "AthleteDiscovery", "BeingSeen", "SowetoLeague"];

  const handleToggleHashtag = (tag: string) => {
    if (selectedHashtags.includes(tag)) {
      setSelectedHashtags(prev => prev.filter(t => t !== tag));
    } else {
      setSelectedHashtags(prev => [...prev, tag]);
    }
  };

  const handleContentTypeSelect = (type: "highlight" | "match" | "training" | "full") => {
    setContentType(type);
    setStep(2);
  };

  const handleStartUpload = async () => {
    setIsUploading(true);
    setStep(5);

    const postData = {
      caption: caption || `High-performance ${contentType} play in the match setup.`,
      position: selectedPosition,
      province: province,
      club: matchContext || "Local Amateur League",
      contentType: contentType === "full" ? "match" : contentType as any,
      tags: selectedHashtags.length > 0 ? selectedHashtags : ["ScoutMe", "KasiFootball"],
      thumbnailUrl: `⚽ ${selectedThumbnail || "Match Play"}`
    };

    if (!isDemoMode && storage && db && selectedFile && currentUser) {
      // Real Firebase Storage upload
      const filePath = `videos/${currentUser.userId}/${Date.now()}_${selectedFile.name}`;
      const storageRef = ref(storage, filePath);
      const uploadTask = uploadBytesResumable(storageRef, selectedFile);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setUploadProgress(pct);
        },
        (error) => {
          console.error("Upload failed:", error);
          setIsUploading(false);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          // Save post to Firestore
          await addDoc(collection(db, "posts"), {
            ...postData,
            videoUrl: downloadURL,
            userId: currentUser.userId,
            userName: currentUser.name,
            createdAt: serverTimestamp(),
          });
          addNewPost({ ...postData, thumbnailUrl: downloadURL });
          setIsUploading(false);
        }
      );
    } else {
      // Demo mode or no file selected — simulate progress
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setUploadProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            addNewPost(postData);
            setIsUploading(false);
          }, 800);
        }
      }, 200);
    }
  };

  const handleFinalFinish = () => {
    onUploadSuccess();
  };

  const provinces = [
    "Gauteng",
    "KwaZulu-Natal",
    "Western Cape",
    "Eastern Cape",
    "Free State",
    "Limpopo",
    "Mpumalanga",
    "North West",
    "Northern Cape"
  ];

  const positions = ["GK", "LB", "CB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST"];

  return (
    <div className="flex-1 pb-24 overflow-y-auto w-full no-scrollbar px-3 space-y-6">
      
      {/* Dynamic onboarding step tracking header */}
      <div className="flex justify-between items-center border-b border-[#1a3825]/40 pb-3">
        <div>
          <h2 className="text-3xl font-extrabold font-bebas tracking-wide text-white">
            UPLOAD HIGHLIGHT <span className="text-[#00e56b]">✦</span>
          </h2>
          <p className="text-[11px] text-[#5a8a6a] font-medium uppercase font-mono mt-0.5">
            Step {step} of 5 · {contentType ? contentType.toUpperCase() : "CHOOSE TYPE"}
          </p>
        </div>
        {step > 1 && step < 5 && (
          <button 
            onClick={() => setStep(step - 1)}
            className="text-xs text-[#5a8a6a] hover:text-white"
          >
            ← Back
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">

        {/* STEP 1 — CHOOSE CONTENT TYPE */}
        {step === 1 && (
          <motion.div
            key="upload1"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-4"
          >
            <div className="text-center py-2">
              <h3 className="text-xl font-bold text-white font-sans uppercase tracking-tight">Select Upload Format</h3>
              <p className="text-xs text-[#5a8a6a] mt-1">What kind of grassroots football footage are you publishing today?</p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              
              {/* Box 1 */}
              <button
                id="type_highlight"
                onClick={() => handleContentTypeSelect("highlight")}
                className="bg-[#0a1a0f] border-2 border-[#1a3825] p-5 rounded-2xl flex flex-col items-center justify-between text-center space-y-3 hover:border-[#00e56b] transition duration-200 cursor-pointer min-h-[160px]"
              >
                <div className="text-3xl bg-[#050e08] p-3 rounded-full text-[#00e56b]">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-white text-xs font-black uppercase tracking-wider font-sans">HIGHLIGHT REEL</h4>
                  <p className="text-[10px] text-[#5a8a6a] leading-relaxed mt-1">Edited compilations of goal moments or physical assists</p>
                </div>
              </button>

              {/* Box 2 */}
              <button
                id="type_match"
                onClick={() => handleContentTypeSelect("match")}
                className="bg-[#0a1a0f] border-2 border-[#1a3825] p-5 rounded-2xl flex flex-col items-center justify-between text-center space-y-3 hover:border-[#00e56b] transition duration-200 cursor-pointer min-h-[160px]"
              >
                <div className="text-3xl bg-[#050e08] p-3 rounded-full text-[#00e56b]">
                  <Video className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-white text-xs font-black uppercase tracking-wider font-sans">MATCH CLIP</h4>
                  <p className="text-[10px] text-[#5a8a6a] leading-relaxed mt-1">Raw, single sequence footage of match transitions</p>
                </div>
              </button>

              {/* Box 3 */}
              <button
                id="type_training"
                onClick={() => handleContentTypeSelect("training")}
                className="bg-[#0a1a0f] border-2 border-[#1a3825] p-5 rounded-2xl flex flex-col items-center justify-between text-center space-y-3 hover:border-[#00e56b] transition duration-200 cursor-pointer min-h-[160px]"
              >
                <div className="text-3xl bg-[#050e08] p-3 rounded-full text-[#00e56b]">
                  <Scissors className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-white text-xs font-black uppercase tracking-wider font-sans">TRAINING DRILL</h4>
                  <p className="text-[10px] text-[#5a8a6a] leading-relaxed mt-1">Display of skill, endurance, or goalkeeper techniques</p>
                </div>
              </button>

              {/* Box 4 */}
              <button
                id="type_full"
                onClick={() => handleContentTypeSelect("full")}
                className="bg-[#0a1a0f] border-2 border-[#1a3825] p-5 rounded-2xl flex flex-col items-center justify-between text-center space-y-3 hover:border-[#00e56b] transition duration-200 cursor-pointer min-h-[160px]"
              >
                <div className="text-3xl bg-[#050e08] p-3 rounded-full text-[#00e56b]">
                  <PlusCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-white text-xs font-black uppercase tracking-wider font-sans">FULL MATCH</h4>
                  <p className="text-[10px] text-[#5a8a6a] leading-relaxed mt-1">Full duration tournament or trials match footage</p>
                </div>
              </button>

            </div>
          </motion.div>
        )}

        {/* STEP 2 — VIDEO SELECTION & TRIMMING CONTROL */}
        {step === 2 && (
          <motion.div
            key="upload2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h3 className="text-md font-bold text-white uppercase">Upload and Trim Clip</h3>
              <p className="text-xs text-[#5a8a6a] mt-0.5">Scrub or drag selectors to crop the most critical trial seconds.</p>
            </div>

            {/* Simulated Video Preview screen */}
            <div className="aspect-video bg-[#050e08] rounded-2xl border border-[#1a3825] flex flex-col items-center justify-center relative overflow-hidden p-4 group">
              <Video className="w-12 h-12 text-[#5a8a6a] mb-2 group-hover:text-[#00e56b] transition active:scale-95 duration-200 cursor-pointer" />
              <span className="text-xs text-white font-medium">Selected: KASI_MOMENT_ASSIST.mp4</span>
              <span className="text-[10px] text-[#5a8a6a] mt-1">File weight: 14.8 MB · Codec: H.264 HD</span>
              
              {/* Trim duration indicator */}
              <div className="absolute top-3 right-3 bg-[#0a1a0f] border border-[#1a3825] px-2 py-0.5 rounded text-[10px] font-mono font-bold text-[#00e56b]">
                DURATION: {Math.round((trimEnd - trimStart) * 0.3)}s
              </div>
            </div>

            {/* Custom interactive trim sliders */}
            <div className="space-y-2 bg-[#0a1a0f] border border-[#1a3825] p-4.5 rounded-xl">
              <label className="block text-xs font-bold text-[#5a8a6a] uppercase tracking-wide">
                🎥 Trim Timeline Adjustments (Start & End)
              </label>
              
              <div className="h-6 bg-[#050e08] rounded-md border border-[#1a3825] relative">
                {/* Visual crop selection bar */}
                <div 
                  className="absolute h-full bg-[#00e56b]/20 border-x-2 border-[#00e56b]"
                  style={{ left: `${trimStart}%`, right: `${100 - trimEnd}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-[#5a8a6a] block font-mono">CROP START: {trimStart}%</span>
                  <input
                    id="slider_trim_start"
                    type="range"
                    min="0"
                    max="45"
                    value={trimStart}
                    onChange={(e) => setTrimStart(parseInt(e.target.value))}
                    className="w-full h-1 bg-[#1a3825] accent-[#00e56b] rounded-full"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-[#5a8a6a] block text-right font-mono">CROP END: {trimEnd}%</span>
                  <input
                    id="slider_trim_end"
                    type="range"
                    min="55"
                    max="100"
                    value={trimEnd}
                    onChange={(e) => setTrimEnd(parseInt(e.target.value))}
                    className="w-full h-1 bg-[#1a3825] accent-[#00e56b] rounded-full"
                  />
                </div>
              </div>
            </div>

            <button
              id="trim_continue_btn"
              onClick={() => setStep(3)}
              className="w-full py-4 bg-[#00e56b] text-[#050e08] font-bold uppercase tracking-wider rounded-xl text-xs flex items-center justify-center space-x-1.5 hover:brightness-105"
            >
              <span>Add Clip Details</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </motion.div>
        )}

        {/* STEP 3 — ADD DETAILS */}
        {step === 3 && (
          <motion.div
            key="upload3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="text-center">
              <h3 className="text-md font-bold text-white uppercase">Clip Match Metadata</h3>
              <p className="text-xs text-[#5a8a6a] mt-0.5">Let’s add context to help scouts categorize you.</p>
            </div>

            {/* Caption (max 200 chars) */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#5a8a6a] uppercase tracking-wide">
                Video Caption Text
              </label>
              <textarea
                id="upload_caption"
                rows={3}
                required
                maxLength={200}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="e.g. Setpiece curve assist during Sunday play-offs. Ready for elite monitoring! ⚡⚽"
                className="w-full bg-[#0a1a0f] border border-[#1a3825] rounded-xl text-xs text-[#e8f5ee] p-3 focus:border-[#00e56b]"
              />
              <span className="block text-[10px] text-right text-[#5a8a6a]">
                {caption.length}/200 characters
              </span>
            </div>

            {/* Position played and Match Context */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#5a8a6a] uppercase mb-1">
                  Position in Clip
                </label>
                <select
                  id="upload_position"
                  value={selectedPosition}
                  onChange={(e) => setSelectedPosition(e.target.value)}
                  className="w-full bg-[#0a1a0f] border border-[#1a3825] rounded-xl text-xs text-white p-2.5"
                >
                  {positions.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5a8a6a] uppercase mb-1">
                  League context
                </label>
                <input
                  id="upload_context"
                  type="text"
                  required
                  value={matchContext}
                  onChange={(e) => setMatchContext(e.target.value)}
                  placeholder="e.g. Soweto Amateurs"
                  className="w-full bg-[#0a1a0f] border border-[#1a3825] rounded-xl text-xs text-white p-2.5"
                />
              </div>
            </div>

            {/* Province drop down */}
            <div>
              <label className="block text-xs font-bold text-[#5a8a6a] uppercase mb-1">
                Province Location
              </label>
              <select
                id="upload_province"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full bg-[#0a1a0f] border border-[#1a3825] rounded-xl text-xs text-white p-2.5"
              >
                {provinces.map(prov => (
                  <option key={prov} value={prov}>{prov}</option>
                ))}
              </select>
            </div>

            {/* Tappable hashtag suggestions */}
            <div className="space-y-1.5 bg-[#050e08] p-3 rounded-lg border border-[#1a3825]">
              <span className="block text-[10.5px] font-bold text-[#5a8a6a] uppercase font-mono">
                💡 Suggested Hashtags (Tap to add)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {hashtagSuggestions.map(tag => {
                  const active = selectedHashtags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleHashtag(tag)}
                      className={`text-[10px] px-2.5 py-1 rounded-full border transition font-mono ${
                        active
                          ? "bg-[#00e56b]/15 text-[#00e56b] border-[#00e56b]/50"
                          : "bg-transparent border-[#1a3825] text-[#5a8a6a]"
                      }`}
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Visibility Toggle */}
            <div>
              <label className="block text-xs font-bold text-[#5a8a6a] uppercase mb-1">
                Public/Private Visibility
              </label>
              <select
                id="upload_visibility"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="w-full bg-[#0a1a0f] border border-[#1a3825] rounded-xl text-xs text-white p-2.5"
              >
                <option value="Public to Platform">Public to whole platform (Scouts & Supporters)</option>
                <option value="Public to All Scouts">Only verified professional scouts</option>
                <option value="Private">Private locked in my locker</option>
              </select>
            </div>

            <button
              id="details_continue_btn"
              onClick={() => setStep(4)}
              className="w-full py-4 bg-[#00e56b] text-[#050e08] font-bold uppercase tracking-wider rounded-xl text-xs flex items-center justify-center space-x-1.5 hover:brightness-105"
            >
              <span>Choose Thumbnail Cover</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* STEP 4 — CHOOSE COVER THUMBNAIL */}
        {step === 4 && (
          <motion.div
            key="upload4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h3 className="text-md font-bold text-white uppercase">Choose Cover frame</h3>
              <p className="text-xs text-[#5a8a6a] mt-0.5">Scrub or pick a layout title card representation.</p>
            </div>

            <div className="grid grid-cols-2 gap-3.5 pt-2">
              <button
                type="button"
                onClick={() => setSelectedThumbnail("⚡ Midfield Assist")}
                className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center space-y-2 text-center text-xs text-white ${
                  selectedThumbnail === "⚡ Midfield Assist" ? "bg-[#0f2318] border-[#00e56b]" : "bg-[#0a1a0f] border-[#1a3825]"
                }`}
              >
                <span className="text-xl">⚽</span>
                <span>"Midfield Assist"</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedThumbnail("🎯 Curved Free Kick")}
                className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center space-y-2 text-center text-xs text-white ${
                  selectedThumbnail === "🎯 Curved Free Kick" ? "bg-[#0f2318] border-[#00e56b]" : "bg-[#0a1a0f] border-[#1a3825]"
                }`}
              >
                <span className="text-xl">🎯</span>
                <span>"Curved Free Kick"</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedThumbnail("🧤 Aerial Save")}
                className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center space-y-2 text-center text-xs text-white ${
                  selectedThumbnail === "🧤 Aerial Save" ? "bg-[#0f2318] border-[#00e56b]" : "bg-[#0a1a0f] border-[#1a3825]"
                }`}
              >
                <span className="text-xl">🧤</span>
                <span>"Aerial Save"</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedThumbnail("⚡ Strike Deflection")}
                className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center space-y-2 text-center text-xs text-white ${
                  selectedThumbnail === "⚡ Strike Deflection" ? "bg-[#0f2318] border-[#00e56b]" : "bg-[#0a1a0f] border-[#1a3825]"
                }`}
              >
                <span className="text-xl">🏟</span>
                <span>"Strike Deflection"</span>
              </button>
            </div>

            {/* File picker — real upload */}
            {!isDemoMode && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full py-3 border-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 transition-colors ${
                    selectedFile
                      ? "border-[#00e56b] text-[#00e56b] bg-[#0f2318]"
                      : "border-[#1a3825] text-[#5a8a6a] hover:border-[#00e56b]/50"
                  }`}
                >
                  <Video className="w-4 h-4" />
                  <span>{selectedFile ? `✓ ${selectedFile.name.slice(0, 30)}` : "SELECT VIDEO FILE"}</span>
                </button>
              </div>
            )}

            <button
              id="confirm_upload_btn"
              onClick={handleStartUpload}
              className="w-full py-4 bg-[#00e56b] text-[#050e08] font-bold uppercase tracking-wider rounded-xl text-xs flex items-center justify-center space-x-1.5 hover:brightness-105"
            >
              <span>CONFIRM & GO LIVE</span>
              <CheckCircle className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* STEP 5 — CONFIRM AND UPLOAD LOADING SUCCESS */}
        {step === 5 && (
          <motion.div
            key="upload5"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8 flex flex-col items-center py-6 text-center"
          >
            {isUploading ? (
              <>
                <div className="w-16 h-16 rounded-full border-4 border-t-[#00e56b] border-[#1a3825] animate-spin mb-4" />
                
                <div className="space-y-2 w-full max-w-xs">
                  <h3 className="text-lg font-bold text-white uppercase">Uploading Clip to Pitch...</h3>
                  <div className="h-2.5 bg-[#050e08] rounded-full overflow-hidden border border-[#1a3825]">
                    <div 
                      className="h-full bg-[#00e56b] transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <span className="text-xs text-[#5a8a6a] font-mono block mt-1">{uploadProgress}% Complete</span>
                </div>
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-full bg-[#0f2318] border border-[#00e56b] flex items-center justify-center relative mb-4 shadow-xl">
                  <CheckCircle className="w-10 h-10 text-[#00e56b] stroke-[2.5]" />
                  <div className="absolute inset-0 rounded-full border border-[#00e56b]/30 animate-ping" />
                </div>

                <div className="space-y-2 max-w-xs">
                  <h3 className="text-3xl font-extrabold font-bebas tracking-wide text-white">Your pitch is live</h3>
                  <p className="text-xs text-[#5a8a6a] leading-relaxed px-4">
                    "Your pitch is live. Scouts can find you and run AI scouting metrics now."
                  </p>
                </div>

                <div className="w-full max-w-xs pt-10">
                  <button
                    id="finish_upload_flow_btn"
                    onClick={handleFinalFinish}
                    className="w-full py-4 bg-[#00e56b] text-[#050e08] rounded-xl font-bold uppercase tracking-wider text-xs hover:brightness-105 transition"
                  >
                    RETURN TO FEED
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}

      </AnimatePresence>

    </div>
  );
};
