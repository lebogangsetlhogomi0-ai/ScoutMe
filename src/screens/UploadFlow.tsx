import React, { useState, useRef, useCallback } from "react";
import { useApp } from "../context/AppContext";
import {
  PlusCircle, Video, CheckCircle, ArrowRight,
  X, Scissors, Layers, AlertTriangle, ChevronDown, ChevronUp,
  RefreshCw, Info, Image as ImageIcon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { isDemoMode } from "../firebase";

interface UploadFlowProps {
  onUploadSuccess: () => void;
}

// Duration limits in seconds per content type
const DURATION_LIMITS: Record<string, number> = {
  highlight: 90,
  match: 300,
  training: 180,
  full: 600,
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  highlight: "Highlight Reel",
  match: "Match Clip",
  training: "Training Drill",
  full: "Full Match",
  photo: "Photo / Image",
};

const CONTENT_TYPE_INFO: Record<string, string> = {
  highlight: "max 90 sec · 500MB · MP4/MOV",
  match: "max 5 min · 500MB · MP4/MOV",
  training: "max 3 min · 500MB · MP4/MOV",
  full: "max 10 min · 500MB · MP4/MOV",
  photo: "max 8MB · JPG/PNG/WEBP",
};

const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/x-matroska", "video/avi"];
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_VIDEO_SIZE_MB = 500;
const MAX_IMAGE_SIZE_MB = 8;
const MIN_DURATION_SEC = 5;

function formatBytes(bytes: number) {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)}MB` : `${(bytes / 1024).toFixed(0)}KB`;
}

function formatSeconds(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

const PLATFORM_TEMPLATES = [
  { id: "player_of_week", label: "🏆 Player of the Week", desc: "Feature top player · auto Monday", border: "border-[#f5c518]", accent: "#f5c518" },
  { id: "signing", label: "✍️ Signing Announcement", desc: "Player × Club · discovered on ScoutMe", border: "border-[#00e56b]", accent: "#00e56b" },
  { id: "most_improved", label: "📈 Most Improved", desc: "Before/after score showcase", border: "border-[#f5c518]", accent: "#f5c518" },
  { id: "platform_update", label: "📢 Platform Update", desc: "Text only · no video required", border: "border-[#00e56b]", accent: "#00e56b" },
  { id: "trial_challenge", label: "⚡ Virtual Trial Challenge", desc: "Weekly drill challenge", border: "border-[#f5c518]", accent: "#f5c518" },
] as const;

export const UploadFlow: React.FC<UploadFlowProps> = ({ onUploadSuccess }) => {
  const { addNewPost, createPost, currentUser, users } = useApp();
  const isPlatform = currentUser?.role === "platform";
  const [step, setStep] = useState(1);
  const [contentType, setContentType] = useState<"highlight" | "match" | "training" | "full" | "photo" | null>(null);

  // File & validation
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [isHorizontal, setIsHorizontal] = useState(false);
  const [showOrientationTip, setShowOrientationTip] = useState(false);
  const [showTrimWarning, setShowTrimWarning] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tips card
  const [tipExpanded, setTipExpanded] = useState(false);

  // Details
  const [caption, setCaption] = useState("");
  const [selectedPosition, setSelectedPosition] = useState(currentUser?.position || "CAM");
  const [matchContext, setMatchContext] = useState("");
  const [province, setProvince] = useState(currentUser?.province || "Gauteng");
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [visibility, setVisibility] = useState("Public to Platform");

  // Thumbnail
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);

  // Music
  const [audioType, setAudioType] = useState<"jamendo" | "upload" | "original" | "none">("original");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioTitle, setAudioTitle] = useState("");
  const [audioArtist, setAudioArtist] = useState("");
  const [jamendoQuery, setJamendoQuery] = useState("");
  const [jamendoResults, setJamendoResults] = useState<{ id: string; name: string; artist_name: string; duration: number; audio: string; image: string }[]>([]);
  const [jamendoLoading, setJamendoLoading] = useState(false);
  const [jamendoError, setJamendoError] = useState<string | null>(null);
  const [playingPreviewId, setPlayingPreviewId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Platform template state
  const [platformTemplate, setPlatformTemplate] = useState<string | null>(null);
  const [platformCaption, setPlatformCaption] = useState("");
  const [featuredPlayerId, setFeaturedPlayerId] = useState("");
  const [platformPosting, setPlatformPosting] = useState(false);

  // Upload state
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [uploadStartTime, setUploadStartTime] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadDone, setUploadDone] = useState(false);

  const hashtagSuggestions = ["ScoutMe", "KasiFootball", "AthleteDiscovery", "BeingSeen", "SowetoLeague"];
  const provinces = ["Gauteng","KwaZulu-Natal","Western Cape","Eastern Cape","Free State","Limpopo","Mpumalanga","North West","Northern Cape"];
  const positions = ["GK", "LB", "CB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST"];

  const handleToggleHashtag = (tag: string) => {
    setSelectedHashtags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const [taggedUserIds, setTaggedUserIds] = useState<string[]>([]);

  const handleContentTypeSelect = (type: "highlight" | "match" | "training" | "full" | "photo") => {
    setContentType(type);
    setStep(2);
  };

  const searchJamendo = async (query: string) => {
    if (!query.trim()) return;
    const clientId = import.meta.env.VITE_JAMENDO_CLIENT_ID;
    if (!clientId) {
      setJamendoError("Jamendo not configured — add VITE_JAMENDO_CLIENT_ID to Vercel environment variables.");
      return;
    }
    setJamendoLoading(true);
    setJamendoError(null);
    try {
      const res = await fetch(
        `https://api.jamendo.com/v3.0/tracks/?client_id=${clientId}&format=json&limit=10&namesearch=${encodeURIComponent(query)}&audioformat=mp31`
      );
      const data = await res.json();
      setJamendoResults(data.results || []);
      if ((data.results || []).length === 0) setJamendoError("No tracks found. Try a different search.");
    } catch {
      setJamendoError("Search failed. Check your connection.");
    } finally {
      setJamendoLoading(false);
    }
  };

  const togglePreview = (trackId: string, audioSrc: string) => {
    if (playingPreviewId === trackId) {
      previewAudioRef.current?.pause();
      setPlayingPreviewId(null);
    } else {
      if (previewAudioRef.current) previewAudioRef.current.pause();
      const audio = new Audio(audioSrc);
      audio.play().catch(() => {});
      previewAudioRef.current = audio;
      setPlayingPreviewId(trackId);
      audio.onended = () => setPlayingPreviewId(null);
    }
  };

  const validateAndSetFile = useCallback((file: File) => {
    setValidationError(null);
    setShowOrientationTip(false);
    setShowTrimWarning(false);

    const isVideo = ACCEPTED_VIDEO_TYPES.includes(file.type) || file.name.match(/\.(mp4|mov|avi|mkv)$/i);
    const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type) || file.name.match(/\.(jpg|jpeg|png|webp)$/i);

    if (!isVideo && !isImage) {
      setValidationError("This file type is not supported. Please use MP4, MOV for videos or JPG, PNG for images.");
      return;
    }

    const sizeMB = file.size / (1024 * 1024);

    if (isVideo && sizeMB > MAX_VIDEO_SIZE_MB) {
      setValidationError(
        `Video is too large (${sizeMB.toFixed(0)}MB, max 500MB). Please compress your video and try again.\n\nTip: A 90-second clip at 1080p is usually under 200MB.`
      );
      return;
    }

    if (isImage && sizeMB > MAX_IMAGE_SIZE_MB) {
      setValidationError(`Image is too large (${sizeMB.toFixed(0)}MB, max 8MB). Please reduce the file size and try again.`);
      return;
    }

    if (isVideo) {
      const videoEl = document.createElement("video");
      videoEl.preload = "metadata";
      const url = URL.createObjectURL(file);
      videoEl.src = url;
      videoEl.onloadedmetadata = () => {
        const dur = videoEl.duration;
        const w = videoEl.videoWidth;
        const h = videoEl.videoHeight;
        URL.revokeObjectURL(url);
        setVideoDuration(dur);

        if (dur < MIN_DURATION_SEC) {
          setValidationError(`Video is too short (${Math.round(dur)}s). Minimum is 5 seconds.`);
          return;
        }

        const limit = contentType ? DURATION_LIMITS[contentType] : 90;
        if (dur > limit) {
          setShowTrimWarning(true);
        }

        if (w > 0 && h > 0 && w > h) {
          setIsHorizontal(true);
          setShowOrientationTip(true);
        }

        setSelectedFile(file);
      };
      videoEl.onerror = () => {
        URL.revokeObjectURL(url);
        setValidationError("Could not read this video file. Please try a different file.");
      };
    } else {
      setSelectedFile(file);
    }
  }, [contentType]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 10);
    if (files.length === 0) return;
    if (files.length === 1) {
      validateAndSetFile(files[0]);
      setSelectedFiles(files);
    } else {
      // Multi-file carousel: validate each file quickly (size + type only)
      const valid: File[] = [];
      for (const file of files) {
        const isVideo = ACCEPTED_VIDEO_TYPES.includes(file.type) || /\.(mp4|mov|avi|mkv)$/i.test(file.name);
        const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type) || /\.(jpg|jpeg|png|webp)$/i.test(file.name);
        if (!isVideo && !isImage) continue;
        valid.push(file);
      }
      if (valid.length === 0) {
        setValidationError("None of the selected files are supported. Use MP4/MOV for video or JPG/PNG for images.");
        return;
      }
      setSelectedFiles(valid);
      setSelectedFile(valid[0]);
      setValidationError(null);
    }
    e.target.value = "";
  };

  const canProceedFromStep2 = selectedFile !== null && validationError === null;

  const handleStartUpload = async () => {
    setIsUploading(true);
    setUploadDone(false);
    setUploadError(null);
    setStep(6);

    const postData = {
      caption: caption || `High-performance ${contentType} play in the match setup.`,
      position: selectedPosition,
      province,
      club: matchContext || "Local Amateur League",
      contentType: contentType === "full" ? "match" : contentType as any,
      tags: selectedHashtags.length > 0 ? selectedHashtags : ["ScoutMe", "KasiFootball"],
      thumbnailUrl: coverImageUrl || "",
    };

    if (!isDemoMode && selectedFile && currentUser) {
      const filesToUpload = selectedFiles.length > 1 ? selectedFiles : [selectedFile];
      setTotalBytes(filesToUpload.reduce((sum, f) => sum + f.size, 0));
      setUploadStartTime(Date.now());

      // For carousel (multi-file): upload all via fetch, collect URLs
      if (filesToUpload.length > 1) {
        try {
          const urls: string[] = [];
          for (let i = 0; i < filesToUpload.length; i++) {
            const f = filesToUpload[i];
            const isImg = ACCEPTED_IMAGE_TYPES.includes(f.type) || /\.(jpg|jpeg|png|webp)$/i.test(f.name);
            const fd = new FormData();
            fd.append("file", f);
            fd.append("upload_preset", "yeojbrl8");
            fd.append("folder", `scoutme/carousel/${currentUser.userId}`);
            const res = await fetch(`https://api.cloudinary.com/v1_1/oqojtuol/${isImg ? "image" : "video"}/upload`, { method: "POST", body: fd });
            const json = await res.json();
            if (json.secure_url) urls.push(json.secure_url);
            setUploadProgress(Math.round(((i + 1) / filesToUpload.length) * 100));
          }
          const firstIsImage = ACCEPTED_IMAGE_TYPES.includes(filesToUpload[0].type) || /\.(jpg|jpeg|png|webp)$/i.test(filesToUpload[0].name);
          await createPost({
            videoUrl: urls[0] || "",
            thumbnailUrl: firstIsImage ? urls[0] : (coverImageUrl || ""),
            caption: postData.caption,
            tags: postData.tags,
            contentType: postData.contentType,
            position: postData.position,
            league: postData.club,
            province: postData.province,
            taggedUsers: taggedUserIds.length > 0 ? taggedUserIds : undefined,
            audioType: audioType !== "original" ? audioType : undefined,
            audioUrl: audioType === "jamendo" || audioType === "upload" ? (audioUrl || undefined) : undefined,
            audioTitle: audioTitle || undefined,
            audioArtist: audioArtist || undefined,
            carouselUrls: urls,
          });
          setIsUploading(false);
          setUploadDone(true);
        } catch (err) {
          console.error("Carousel upload failed:", err);
          setUploadError("Upload failed. Please check your connection and try again.");
          setIsUploading(false);
        }
        return;
      }

      // Single file: XHR with progress
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("upload_preset", "yeojbrl8");
      formData.append("folder", `scoutme/videos/${currentUser.userId}`);

      const isImageFile = ACCEPTED_IMAGE_TYPES.includes(selectedFile.type) || selectedFile.name.match(/\.(jpg|jpeg|png|webp)$/i);
      const cloudinaryResource = isImageFile ? "image" : "video";
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `https://api.cloudinary.com/v1_1/oqojtuol/${cloudinaryResource}/upload`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(pct);
          setUploadedBytes(e.loaded);
          setTotalBytes(e.total);
        }
      };

      xhr.onload = async () => {
        if (xhr.status === 200) {
          try {
            const result = JSON.parse(xhr.responseText);
            await createPost({
              videoUrl: result.secure_url,
              thumbnailUrl: isImageFile ? result.secure_url : (coverImageUrl || ""),
              caption: postData.caption,
              tags: postData.tags,
              contentType: postData.contentType,
              position: postData.position,
              league: postData.club,
              province: postData.province,
              taggedUsers: taggedUserIds.length > 0 ? taggedUserIds : undefined,
              audioType: audioType !== "original" ? audioType : undefined,
              audioUrl: audioType === "jamendo" || audioType === "upload" ? (audioUrl || undefined) : undefined,
              audioTitle: audioTitle || undefined,
              audioArtist: audioArtist || undefined,
            });
          } catch (err) {
            console.error("Post save failed:", err);
          }
          setIsUploading(false);
          setUploadDone(true);
        } else {
          console.error("Cloudinary upload failed:", xhr.responseText);
          setUploadError("Upload failed. Please check your connection and try again.");
          setIsUploading(false);
        }
      };

      xhr.onerror = () => {
        setUploadError("Upload failed. Please check your connection and try again.");
        setIsUploading(false);
      };

      xhr.send(formData);
    } else {
      // Demo / no file — simulate progress with detail
      let progress = 0;
      const fakeSize = selectedFile?.size || 50 * 1024 * 1024;
      setTotalBytes(fakeSize);
      setUploadStartTime(Date.now());
      const interval = setInterval(() => {
        progress += 5;
        setUploadProgress(Math.min(progress, 100));
        setUploadedBytes(Math.floor((Math.min(progress, 100) / 100) * fakeSize));
        if (progress >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            createPost({
              videoUrl: "",
              thumbnailUrl: postData.thumbnailUrl,
              caption: postData.caption,
              tags: postData.tags,
              contentType: postData.contentType,
              position: postData.position,
              league: postData.club,
              province: postData.province,
            });
            setIsUploading(false);
            setUploadDone(true);
          }, 600);
        }
      }, 150);
    }
  };

  const handleRetry = () => {
    setUploadError(null);
    setIsUploading(false);
    setUploadProgress(0);
    setUploadedBytes(0);
    setStep(5);
  };

  const etaSeconds = (() => {
    if (!uploadStartTime || uploadProgress <= 0 || uploadProgress >= 100) return null;
    const elapsed = (Date.now() - uploadStartTime) / 1000;
    const rate = uploadedBytes / elapsed;
    if (rate <= 0) return null;
    const remaining = totalBytes - uploadedBytes;
    return Math.round(remaining / rate);
  })();

  // Agreement gate — must sign before posting (platform account is exempt)
  if (!currentUser?.agreementSigned && currentUser?.role !== "platform") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center space-y-6 pb-24">
        <div className="w-16 h-16 rounded-full bg-[#1a0a0a] border border-[#ff4444]/40 flex items-center justify-center text-3xl">🔒</div>
        <div className="space-y-2">
          <h3 className="text-2xl font-extrabold font-bebas tracking-wide text-white uppercase">Agreement Required</h3>
          <p className="text-xs text-[#5a8a6a] leading-relaxed max-w-xs">
            You must sign the ScoutMe Digital Agreement before you can upload content. Head to your Profile to sign it.
          </p>
        </div>
        <div className="bg-[#0a1a0f] border border-[#1a3825] rounded-2xl p-4 text-left w-full max-w-xs space-y-1.5">
          <p className="text-[10px] uppercase font-mono font-bold text-[#5a8a6a]">Why this matters</p>
          <p className="text-xs text-[#e8f5ee] leading-relaxed">The agreement protects your content rights and ensures scouts can legally assess your highlights.</p>
        </div>
        <p className="text-[11px] text-[#5a8a6a]">Go to <span className="text-[#00e56b] font-bold">Profile → Edit Biography</span> area to find and sign the agreement.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 pb-24 overflow-y-auto w-full no-scrollbar px-3 space-y-4">

      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#1a3825]/40 pb-3 pt-1">
        <div>
          <h2 className="text-3xl font-extrabold font-bebas tracking-wide text-white">
            UPLOAD HIGHLIGHT <span className="text-[#00e56b]">✦</span>
          </h2>
          <p className="text-[11px] text-[#5a8a6a] font-medium uppercase font-mono mt-0.5">
            Step {step} of 6 · {contentType ? CONTENT_TYPE_LABELS[contentType] : "CHOOSE TYPE"}
          </p>
        </div>
        {step > 1 && step < 6 && (
          <button onClick={() => setStep(step - 1)} className="text-xs text-[#5a8a6a] hover:text-white">
            ← Back
          </button>
        )}
      </div>

      {/* Collapsible tips card */}
      {step < 6 && (
        <div className="bg-[#0a1a0f] border border-[#1a3825] rounded-xl overflow-hidden">
          <button
            onClick={() => setTipExpanded(v => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-left"
          >
            <span className="text-[11px] font-bold text-[#00e56b] uppercase tracking-wide">📱 Get the best quality</span>
            {tipExpanded ? <ChevronUp className="w-4 h-4 text-[#5a8a6a]" /> : <ChevronDown className="w-4 h-4 text-[#5a8a6a]" />}
          </button>
          <AnimatePresence>
            {tipExpanded && (
              <motion.ul
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-4 pb-3 space-y-1 text-[10.5px] text-[#5a8a6a] list-disc list-inside overflow-hidden"
              >
                <li>Film vertically (9:16) for best results on Instagram and TikTok</li>
                <li>Keep highlight clips under 90 seconds</li>
                <li>MP4 format works best</li>
                <li>Good lighting makes a huge difference — film outdoors when possible</li>
                <li>Make sure your face or action is clearly visible in the first 3 seconds</li>
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={contentType === "photo"
          ? "image/jpeg,image/jpg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          : "video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,.mp4,.mov,.avi,.mkv,image/jpeg,image/jpg,image/png,image/webp,.jpg,.jpeg,.png,.webp"}
        className="hidden"
        onChange={handleFileChange}
      />

      <AnimatePresence mode="wait">

        {/* ─── STEP 1 — CHOOSE TYPE ─── */}
        {step === 1 && (
          <motion.div key="upload1" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-4">
            {isPlatform ? (
              /* Platform account: official post templates */
              <>
                <div className="text-center py-1">
                  <h3 className="text-xl font-bold text-[#00e56b] font-bebas tracking-wide uppercase">◆ Official Post Templates</h3>
                  <p className="text-xs text-[#5a8a6a] mt-1">Choose a post type to publish as ScoutMe Official</p>
                </div>
                <div className="space-y-3">
                  {PLATFORM_TEMPLATES.map(tmpl => (
                    <button
                      key={tmpl.id}
                      onClick={() => { setPlatformTemplate(tmpl.id); setContentType("highlight"); setStep(2); }}
                      className={`w-full bg-[#0a1a0f] border-2 ${tmpl.border} p-4 rounded-2xl flex items-center justify-between hover:bg-[#0f2318] transition`}
                    >
                      <div className="text-left">
                        <p className="text-sm font-bold text-white">{tmpl.label}</p>
                        <p className="text-[10px] text-[#5a8a6a] font-mono mt-0.5">{tmpl.desc}</p>
                      </div>
                      <span className="text-[#5a8a6a]">→</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              /* Regular player upload */
              <>
                <div className="text-center py-1">
                  <h3 className="text-xl font-bold text-white font-sans uppercase tracking-tight">Select Upload Format</h3>
                  <p className="text-xs text-[#5a8a6a] mt-1">What kind of footage are you publishing today?</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {(["highlight", "match", "training", "full", "photo"] as const).map((type) => {
                    const icons = { highlight: Layers, match: Video, training: Scissors, full: PlusCircle, photo: ImageIcon };
                    const Icon = icons[type];
                    return (
                      <button
                        key={type}
                        onClick={() => handleContentTypeSelect(type)}
                        className="bg-[#0a1a0f] border-2 border-[#1a3825] p-4 rounded-2xl flex flex-col items-center text-center space-y-2 hover:border-[#00e56b] transition duration-200 min-h-[150px] justify-between"
                      >
                        <div className="bg-[#050e08] p-3 rounded-full text-[#00e56b]">
                          <Icon className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-white text-xs font-black uppercase tracking-wider font-sans">{CONTENT_TYPE_LABELS[type]}</h4>
                          <p className="text-[9.5px] text-[#5a8a6a] mt-0.5 font-mono">{CONTENT_TYPE_INFO[type]}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* ─── STEP 2 — PLATFORM TEMPLATE FORM (text-only posts) ─── */}
        {step === 2 && isPlatform && platformTemplate === "platform_update" && (
          <motion.div key="platform_form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="text-center">
              <h3 className="text-md font-bold text-[#00e56b] uppercase font-bebas tracking-wide">📢 Platform Update</h3>
              <p className="text-xs text-[#5a8a6a] mt-0.5">This post requires no video</p>
            </div>
            <textarea
              rows={5}
              value={platformCaption}
              onChange={e => setPlatformCaption(e.target.value)}
              placeholder="Write your platform update message..."
              className="w-full bg-[#0a1a0f] border border-[#1a3825] text-white rounded-xl px-4 py-3 text-sm focus:border-[#00e56b] focus:outline-none resize-none"
            />
            <button
              disabled={!platformCaption.trim() || platformPosting}
              onClick={async () => {
                setPlatformPosting(true);
                await createPost({ videoUrl: "", caption: platformCaption, tags: ["ScoutMe"], contentType: "platform_update", position: "—", province: "South Africa" });
                setPlatformPosting(false);
                onUploadSuccess();
              }}
              className="w-full bg-[#00e56b] text-[#050e08] py-3 rounded-xl text-sm font-black uppercase tracking-widest disabled:opacity-40"
            >
              {platformPosting ? "Publishing..." : "◆ Publish Update"}
            </button>
          </motion.div>
        )}

        {/* ─── STEP 2 — PLATFORM TEMPLATE FORM (player-pick posts) ─── */}
        {step === 2 && isPlatform && platformTemplate !== "platform_update" && platformTemplate !== null && (
          <motion.div key="platform_player_form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="text-center">
              <h3 className="text-md font-bold text-[#00e56b] uppercase font-bebas tracking-wide">
                {PLATFORM_TEMPLATES.find(t => t.id === platformTemplate)?.label}
              </h3>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-[#5a8a6a] tracking-wider block">Select Player</label>
              <select
                value={featuredPlayerId}
                onChange={e => setFeaturedPlayerId(e.target.value)}
                className="w-full bg-[#0a1a0f] border border-[#1a3825] text-white rounded-xl px-3 py-2.5 text-sm focus:border-[#00e56b] focus:outline-none"
              >
                <option value="">-- Choose a player --</option>
                {users.filter(u => u.role === "player").map(u => (
                  <option key={u.userId} value={u.userId}>{u.name} · {u.position} · {u.province}</option>
                ))}
              </select>
            </div>
            <textarea
              rows={4}
              value={platformCaption}
              onChange={e => setPlatformCaption(e.target.value)}
              placeholder="Add a message about this player..."
              className="w-full bg-[#0a1a0f] border border-[#1a3825] text-white rounded-xl px-4 py-3 text-sm focus:border-[#00e56b] focus:outline-none resize-none"
            />
            <button
              disabled={!platformCaption.trim() || !featuredPlayerId || platformPosting}
              onClick={async () => {
                setPlatformPosting(true);
                const player = users.find(u => u.userId === featuredPlayerId);
                const finalCaption = platformTemplate === "signing"
                  ? `${platformCaption}\n\nDiscovered on ScoutMe 🇿🇦⚽`
                  : platformCaption;
                await createPost({
                  videoUrl: "",
                  caption: finalCaption,
                  tags: ["ScoutMe"],
                  contentType: platformTemplate as any,
                  position: player?.position || "—",
                  province: player?.province || "South Africa",
                  featuredPlayerId,
                  featuredPlayerName: player?.name,
                });
                setPlatformPosting(false);
                onUploadSuccess();
              }}
              className="w-full bg-[#00e56b] text-[#050e08] py-3 rounded-xl text-sm font-black uppercase tracking-widest disabled:opacity-40"
            >
              {platformPosting ? "Publishing..." : "◆ Publish Post"}
            </button>
          </motion.div>
        )}

        {/* ─── STEP 2 — SELECT VIDEO (regular players) ─── */}
        {step === 2 && !isPlatform && (
          <motion.div key="upload2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="text-center">
              <h3 className="text-md font-bold text-white uppercase">Select Your Video</h3>
              <p className="text-xs text-[#5a8a6a] mt-0.5">
                {contentType && CONTENT_TYPE_INFO[contentType]}
              </p>
            </div>

            {/* Validation error */}
            <AnimatePresence>
              {validationError && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-start space-x-2 bg-[#1a0a0a] border border-[#ff4444]/40 rounded-xl p-3"
                >
                  <AlertTriangle className="w-4 h-4 text-[#ff4444] flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-[#ff6666] whitespace-pre-line leading-relaxed">{validationError}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tap-to-select area */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`w-full aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center relative overflow-hidden p-4 transition-all duration-200 active:scale-[0.98] ${
                selectedFile
                  ? "bg-[#0f2318] border-[#00e56b]/60"
                  : validationError
                  ? "bg-[#1a0a0a] border-[#ff4444]/40 hover:border-[#ff4444]/60"
                  : "bg-[#050e08] border-[#1a3825] hover:border-[#00e56b]/50"
              }`}
            >
              {selectedFile ? (
                <>
                  <CheckCircle className="w-12 h-12 text-[#00e56b] mb-2" />
                  {selectedFiles.length > 1 ? (
                    <>
                      <span className="text-xs text-white font-bold">{selectedFiles.length} files selected</span>
                      <span className="text-[10px] text-[#5a8a6a] mt-1">
                        {selectedFiles.map(f => f.name.split(".").pop()?.toUpperCase()).join(", ")} · Tap to change
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-xs text-white font-bold">
                        {selectedFile.name.length > 32 ? selectedFile.name.slice(0, 32) + "…" : selectedFile.name}
                      </span>
                      <span className="text-[10px] text-[#5a8a6a] mt-1">
                        {formatBytes(selectedFile.size)}
                        {videoDuration ? ` · ${formatSeconds(videoDuration)}` : ""}
                        {" · Tap to change"}
                      </span>
                    </>
                  )}
                  <div className="absolute top-3 right-3 bg-[#0f2318] border border-[#00e56b]/40 px-2 py-0.5 rounded text-[10px] font-mono font-bold text-[#00e56b]">
                    READY
                  </div>
                </>
              ) : (
                <>
                  <Video className="w-14 h-14 text-[#5a8a6a] mb-3" />
                  <span className="text-sm font-bold text-white uppercase tracking-wide">Tap to Select Files</span>
                  <span className="text-[10px] text-[#5a8a6a] mt-1">Up to 10 photos or videos · MP4, MOV, JPG, PNG</span>
                </>
              )}
            </button>

            {/* Orientation tip */}
            <AnimatePresence>
              {showOrientationTip && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-start justify-between bg-[#0f1d0a] border border-[#1a3825] rounded-xl p-3"
                >
                  <div className="flex items-start space-x-2">
                    <Info className="w-4 h-4 text-[#f5c518] flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-[#e8d87a] leading-relaxed">
                      💡 Tip: Vertical videos (9:16) perform 70% better on Instagram Reels and TikTok. Consider filming vertically next time.
                    </p>
                  </div>
                  <button onClick={() => setShowOrientationTip(false)} className="ml-2 flex-shrink-0">
                    <X className="w-4 h-4 text-[#5a8a6a]" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Duration warning modal */}
            <AnimatePresence>
              {showTrimWarning && videoDuration && contentType && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="bg-[#1a1208] border border-[#f5c518]/40 rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-[#f5c518] flex-shrink-0" />
                    <h4 className="text-sm font-bold text-[#f5c518] uppercase">Video Too Long</h4>
                  </div>
                  <p className="text-xs text-[#e8d87a] leading-relaxed">
                    Your video is {formatSeconds(videoDuration)} long.{" "}
                    {contentType === "highlight" || contentType === "match"
                      ? "For best reach on Instagram and TikTok, we recommend keeping Highlight Reels under 90 seconds. Instagram stops recommending videos over 3 minutes to new viewers."
                      : `${CONTENT_TYPE_LABELS[contentType]} uploads must be under ${formatSeconds(DURATION_LIMITS[contentType])}.`}
                  </p>
                  <div className="flex space-x-2">
                    {(contentType === "highlight" || contentType === "match") && (
                      <button
                        onClick={() => { setShowTrimWarning(false); setSelectedFile(null); setVideoDuration(null); fileInputRef.current?.click(); }}
                        className="flex-1 py-2 text-[10px] font-bold uppercase bg-[#f5c518] text-black rounded-xl"
                      >
                        Choose Shorter Clip
                      </button>
                    )}
                    <button
                      onClick={() => setShowTrimWarning(false)}
                      className={`py-2 text-[10px] font-bold uppercase border border-[#5a8a6a] text-[#5a8a6a] rounded-xl ${
                        contentType === "highlight" || contentType === "match" ? "flex-1" : "w-full"
                      }`}
                    >
                      {contentType === "highlight" || contentType === "match" ? "Upload Anyway" : "Choose Different File"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={() => setStep(3)}
              disabled={!canProceedFromStep2}
              className={`w-full py-4 font-bold uppercase tracking-wider rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all ${
                canProceedFromStep2
                  ? "bg-[#00e56b] text-[#050e08] hover:brightness-105"
                  : "bg-[#1a3825] text-[#5a8a6a] cursor-not-allowed"
              }`}
            >
              <span>Add Clip Details</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </motion.div>
        )}

        {/* ─── STEP 3 — DETAILS ─── */}
        {step === 3 && (
          <motion.div key="upload3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="text-center">
              <h3 className="text-md font-bold text-white uppercase">Clip Match Metadata</h3>
              <p className="text-xs text-[#5a8a6a] mt-0.5">Add context to help scouts categorize you.</p>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#5a8a6a] uppercase tracking-wide">Video Caption</label>
              <textarea
                rows={3}
                maxLength={200}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="e.g. Setpiece curve assist during Sunday play-offs. Ready for elite monitoring! ⚡⚽"
                className="w-full bg-[#0a1a0f] border border-[#1a3825] rounded-xl text-xs text-[#e8f5ee] p-3 focus:border-[#00e56b] outline-none"
              />
              <span className="block text-[10px] text-right text-[#5a8a6a]">{caption.length}/200</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#5a8a6a] uppercase mb-1">Position</label>
                <select value={selectedPosition} onChange={e => setSelectedPosition(e.target.value)}
                  className="w-full bg-[#0a1a0f] border border-[#1a3825] rounded-xl text-xs text-white p-2.5">
                  {positions.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#5a8a6a] uppercase mb-1">League / Context</label>
                <input type="text" value={matchContext} onChange={e => setMatchContext(e.target.value)}
                  placeholder="e.g. Soweto Amateurs"
                  className="w-full bg-[#0a1a0f] border border-[#1a3825] rounded-xl text-xs text-white p-2.5 outline-none focus:border-[#00e56b]" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5a8a6a] uppercase mb-1">Province</label>
              <select value={province} onChange={e => setProvince(e.target.value)}
                className="w-full bg-[#0a1a0f] border border-[#1a3825] rounded-xl text-xs text-white p-2.5">
                {provinces.map(prov => <option key={prov} value={prov}>{prov}</option>)}
              </select>
            </div>

            <div className="space-y-1.5 bg-[#050e08] p-3 rounded-lg border border-[#1a3825]">
              <span className="block text-[10.5px] font-bold text-[#5a8a6a] uppercase font-mono">💡 Hashtags</span>
              <div className="flex flex-wrap gap-1.5">
                {hashtagSuggestions.map(tag => {
                  const active = selectedHashtags.includes(tag);
                  return (
                    <button key={tag} type="button" onClick={() => handleToggleHashtag(tag)}
                      className={`text-[10px] px-2.5 py-1 rounded-full border transition font-mono ${active ? "bg-[#00e56b]/15 text-[#00e56b] border-[#00e56b]/50" : "bg-transparent border-[#1a3825] text-[#5a8a6a]"}`}>
                      #{tag}
                    </button>
                  );
                })}
                {selectedHashtags.filter(t => !hashtagSuggestions.includes(t)).map(tag => (
                  <button key={tag} type="button" onClick={() => handleToggleHashtag(tag)}
                    className="text-[10px] px-2.5 py-1 rounded-full border transition font-mono bg-[#00e56b]/15 text-[#00e56b] border-[#00e56b]/50">
                    #{tag} ×
                  </button>
                ))}
              </div>
              <form onSubmit={e => {
                e.preventDefault();
                const input = (e.currentTarget.elements.namedItem("customTag") as HTMLInputElement);
                const val = input.value.trim().replace(/^#+/, "").replace(/\s+/g, "");
                if (val && !selectedHashtags.includes(val)) {
                  setSelectedHashtags(prev => [...prev, val]);
                }
                input.value = "";
              }} className="flex gap-2 mt-2">
                <input
                  name="customTag"
                  type="text"
                  placeholder="Add your own tag..."
                  className="flex-1 bg-[#0a1a0f] border border-[#1a3825] rounded-lg text-[11px] text-white px-3 py-1.5 placeholder-[#5a8a6a] focus:border-[#00e56b] outline-none"
                />
                <button type="submit" className="text-[11px] px-3 py-1.5 bg-[#00e56b]/10 border border-[#00e56b]/30 text-[#00e56b] rounded-lg font-bold">Add</button>
              </form>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5a8a6a] uppercase mb-1">Visibility</label>
              <select value={visibility} onChange={e => setVisibility(e.target.value)}
                className="w-full bg-[#0a1a0f] border border-[#1a3825] rounded-xl text-xs text-white p-2.5">
                <option value="Public to Platform">Public — Everyone</option>
                <option value="Private">Private</option>
              </select>
            </div>

            <div className="space-y-1.5 bg-[#050e08] p-3 rounded-lg border border-[#1a3825]">
              <span className="block text-[10.5px] font-bold text-[#5a8a6a] uppercase font-mono">🏷️ Tag Players</span>
              <p className="text-[10px] text-[#5a8a6a]">Tag other players who appear in this clip</p>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                {users.filter(u => (u.role === "player" || u.role === "club") && u.userId !== currentUser?.userId).map(u => {
                  const isTagged = taggedUserIds.includes(u.userId);
                  return (
                    <button key={u.userId} type="button"
                      onClick={() => setTaggedUserIds(prev => isTagged ? prev.filter(id => id !== u.userId) : [...prev, u.userId])}
                      className={`flex items-center space-x-1.5 text-[10px] px-2.5 py-1 rounded-full border transition font-mono ${isTagged ? "bg-[#00e56b]/15 text-[#00e56b] border-[#00e56b]/50" : "bg-transparent border-[#1a3825] text-[#5a8a6a]"}`}>
                      {u.avatarBase64 ? (
                        <img src={u.avatarBase64} className="w-4 h-4 rounded-full object-cover" alt="" />
                      ) : (
                        <span className="w-4 h-4 rounded-full bg-[#1a3825] flex items-center justify-center text-[8px]">👤</span>
                      )}
                      <span>{u.name}</span>
                      {isTagged && <span>✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <button onClick={() => setStep(4)}
              className="w-full py-4 bg-[#00e56b] text-[#050e08] font-bold uppercase tracking-wider rounded-xl text-xs flex items-center justify-center space-x-1.5 hover:brightness-105">
              <span>Add Music</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* ─── STEP 4 — MUSIC ─── */}
        {step === 4 && (
          <motion.div key="upload4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
            <div className="text-center">
              <h3 className="text-md font-bold text-white uppercase">Add Music</h3>
              <p className="text-xs text-[#5a8a6a] mt-0.5">Choose a soundtrack for your clip.</p>
            </div>

            {/* 4 option cards */}
            <div className="grid grid-cols-2 gap-3">
              {([
                { key: "original", label: "Original Sound", icon: "🎙️", desc: "Keep video audio" },
                { key: "none",     label: "No Sound",       icon: "🔇", desc: "Mute everything" },
                { key: "jamendo",  label: "Music Library",  icon: "🎵", desc: "Browse free tracks" },
                { key: "upload",   label: "Upload Audio",   icon: "📁", desc: "Your own file" },
              ] as const).map(opt => (
                <button key={opt.key} type="button" onClick={() => { setAudioType(opt.key); setAudioUrl(null); setAudioTitle(""); setAudioArtist(""); setJamendoResults([]); setJamendoError(null); }}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center text-center space-y-1.5 transition ${audioType === opt.key ? "bg-[#0f2318] border-[#00e56b]" : "bg-[#0a1a0f] border-[#1a3825]"}`}>
                  <span className="text-2xl">{opt.icon}</span>
                  <span className="text-[10px] font-bold text-white uppercase tracking-wide">{opt.label}</span>
                  <span className="text-[9px] text-[#5a8a6a]">{opt.desc}</span>
                </button>
              ))}
            </div>

            {/* Jamendo search panel */}
            {audioType === "jamendo" && (
              <div className="space-y-3 bg-[#050e08] border border-[#1a3825] rounded-xl p-4">
                <form onSubmit={e => { e.preventDefault(); searchJamendo(jamendoQuery); }} className="flex gap-2">
                  <input
                    value={jamendoQuery}
                    onChange={e => setJamendoQuery(e.target.value)}
                    placeholder="Search artist, mood, genre…"
                    className="flex-1 bg-[#0a1a0f] border border-[#1a3825] text-white text-xs px-3 py-2 rounded-lg outline-none focus:border-[#00e56b] placeholder-[#5a8a6a]"
                  />
                  <button type="submit" disabled={jamendoLoading}
                    className="px-4 py-2 bg-[#00e56b] text-[#050e08] rounded-lg text-xs font-bold disabled:opacity-50">
                    {jamendoLoading ? "…" : "Search"}
                  </button>
                </form>
                {jamendoError && <p className="text-[10px] text-red-400">{jamendoError}</p>}
                {audioUrl && audioTitle && (
                  <div className="flex items-center space-x-2 px-3 py-2 bg-[#0f2318] border border-[#00e56b]/40 rounded-lg">
                    <span className="text-[#00e56b] text-lg">🎵</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white font-bold truncate">{audioTitle}</p>
                      <p className="text-[10px] text-[#5a8a6a] truncate">{audioArtist}</p>
                    </div>
                    <button onClick={() => { setAudioUrl(null); setAudioTitle(""); setAudioArtist(""); }} className="text-[#5a8a6a] text-xs hover:text-red-400">✕</button>
                  </div>
                )}
                <div className="space-y-2 max-h-52 overflow-y-auto no-scrollbar">
                  {jamendoResults.map(track => {
                    const selected = audioUrl === track.audio;
                    const playing = playingPreviewId === track.id;
                    return (
                      <div key={track.id}
                        className={`flex items-center space-x-3 p-2.5 rounded-lg border cursor-pointer transition ${selected ? "bg-[#0f2318] border-[#00e56b]/60" : "bg-[#0a1a0f] border-[#1a3825] hover:border-[#1a3825]/80"}`}
                        onClick={() => { setAudioUrl(track.audio); setAudioTitle(track.name); setAudioArtist(track.artist_name); }}>
                        <img src={track.image} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" alt="" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white font-bold truncate">{track.name}</p>
                          <p className="text-[10px] text-[#5a8a6a] truncate">{track.artist_name} · {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, "0")}</p>
                        </div>
                        <button type="button" onClick={e => { e.stopPropagation(); togglePreview(track.id, track.audio); }}
                          className="w-8 h-8 rounded-full bg-[#1a3825] flex items-center justify-center text-[#00e56b] text-xs flex-shrink-0 hover:bg-[#0f2318]">
                          {playing ? "⏸" : "▶"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Upload own audio */}
            {audioType === "upload" && (
              <div className="space-y-3">
                <label className="flex flex-col items-center justify-center gap-3 w-full h-32 rounded-xl border-2 border-dashed border-[#1a3825] bg-[#0a1a0f] cursor-pointer hover:border-[#00e56b]/50 transition-colors">
                  <span className="text-3xl">📁</span>
                  <span className="text-xs text-[#5a8a6a]">Tap to select audio file</span>
                  <input type="file" accept="audio/mp3,audio/mpeg,audio/wav,audio/ogg,audio/aac,.mp3,.wav,.ogg,.aac"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setAudioTitle(file.name.replace(/\.[^.]+$/, ""));
                      setAudioArtist("Your Upload");
                      const url = URL.createObjectURL(file);
                      setAudioUrl(url);
                    }} />
                </label>
                {audioUrl && (
                  <div className="flex items-center space-x-2 px-3 py-2 bg-[#0f2318] border border-[#00e56b]/40 rounded-lg">
                    <span className="text-[#00e56b] text-lg">🎵</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white font-bold truncate">{audioTitle}</p>
                      <p className="text-[10px] text-[#5a8a6a]">Your upload</p>
                    </div>
                    <button onClick={() => { setAudioUrl(null); setAudioTitle(""); }} className="text-[#5a8a6a] text-xs hover:text-red-400">✕</button>
                  </div>
                )}
              </div>
            )}

            <button onClick={() => setStep(5)}
              className="w-full py-4 bg-[#00e56b] text-[#050e08] font-bold uppercase tracking-wider rounded-xl text-xs flex items-center justify-center space-x-1.5 hover:brightness-105">
              <span>Choose Cover Frame</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* ─── STEP 5 — THUMBNAIL ─── */}
        {step === 5 && (
          <motion.div key="upload4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
            <div className="text-center">
              <h3 className="text-md font-bold text-white uppercase">Choose Cover Frame</h3>
              <p className="text-xs text-[#5a8a6a] mt-0.5">Pick an image from your gallery — or skip.</p>
            </div>

            {coverImageUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-[#00e56b]/40">
                <img src={coverImageUrl} alt="Cover" className="w-full h-48 object-cover" />
                <button
                  type="button"
                  onClick={() => { setCoverImageUrl(null); }}
                  className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-3 w-full h-40 rounded-xl border-2 border-dashed border-[#1a3825] bg-[#0a1a0f] cursor-pointer hover:border-[#00e56b]/50 transition-colors">
                <span className="text-3xl">🖼️</span>
                <span className="text-xs text-[#5a8a6a]">Tap to choose from gallery</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => setCoverImageUrl(ev.target?.result as string);
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
            )}

            {selectedFile && (
              <div className="flex items-center space-x-2 px-3 py-2 bg-[#0f2318] border border-[#00e56b]/30 rounded-xl">
                <Video className="w-4 h-4 text-[#00e56b] flex-shrink-0" />
                <span className="text-xs text-[#00e56b] truncate">{selectedFile.name}</span>
                <span className="text-[10px] text-[#5a8a6a] ml-auto flex-shrink-0">{formatBytes(selectedFile.size)}</span>
              </div>
            )}

            <button onClick={handleStartUpload}
              className="w-full py-4 bg-[#00e56b] text-[#050e08] font-bold uppercase tracking-wider rounded-xl text-xs flex items-center justify-center space-x-1.5 hover:brightness-105">
              <span>CONFIRM &amp; GO LIVE</span>
              <CheckCircle className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* ─── STEP 6 — UPLOAD PROGRESS / RESULT ─── */}
        {step === 6 && (
          <motion.div key="upload5" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center py-6 text-center space-y-6">

            {uploadError ? (
              /* Error state */
              <div className="w-full space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#1a0a0a] border border-[#ff4444]/50 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-8 h-8 text-[#ff4444]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white uppercase mb-1">Upload Failed</h3>
                  <p className="text-xs text-[#ff6666] leading-relaxed">{uploadError}</p>
                </div>
                <button onClick={handleRetry}
                  className="flex items-center justify-center space-x-2 mx-auto px-6 py-3 bg-[#1a3825] border border-[#00e56b]/30 rounded-xl text-xs font-bold text-[#00e56b] uppercase hover:bg-[#0f2318]">
                  <RefreshCw className="w-4 h-4" />
                  <span>Try Again</span>
                </button>
              </div>
            ) : uploadDone ? (
              /* Success state */
              <>
                <div className="w-20 h-20 rounded-full bg-[#0f2318] border border-[#00e56b] flex items-center justify-center relative shadow-xl">
                  <CheckCircle className="w-10 h-10 text-[#00e56b] stroke-[2.5]" />
                  <div className="absolute inset-0 rounded-full border border-[#00e56b]/30 animate-ping" />
                </div>
                <div className="space-y-1 max-w-xs">
                  <h3 className="text-3xl font-extrabold font-bebas tracking-wide text-white">Your pitch is live</h3>
                  <p className="text-xs text-[#5a8a6a] leading-relaxed px-4">
                    Your pitch is live. Scouts can find you and run AI scouting metrics now. ✦
                  </p>
                </div>
                <button onClick={onUploadSuccess}
                  className="w-full max-w-xs py-4 bg-[#00e56b] text-[#050e08] rounded-xl font-bold uppercase tracking-wider text-xs hover:brightness-105 transition">
                  RETURN TO FEED
                </button>
              </>
            ) : (
              /* Uploading state */
              <div className="w-full max-w-xs space-y-4">
                <div className="w-16 h-16 rounded-full border-4 border-t-[#00e56b] border-[#1a3825] animate-spin mx-auto" />
                <h3 className="text-lg font-bold text-white uppercase">Uploading to Pitch...</h3>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="h-3 bg-[#050e08] rounded-full overflow-hidden border border-[#1a3825]">
                    <motion.div
                      className="h-full bg-[#00e56b] rounded-full"
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-[#5a8a6a]">
                    <span>Uploading... {uploadProgress}%</span>
                    <span>{formatBytes(uploadedBytes)} of {formatBytes(totalBytes)}</span>
                  </div>
                  {etaSeconds !== null && etaSeconds > 0 && (
                    <p className="text-[10px] text-[#5a8a6a] font-mono text-center">
                      About {etaSeconds < 60 ? `${etaSeconds} seconds` : `${Math.ceil(etaSeconds / 60)} minutes`} left
                    </p>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};
