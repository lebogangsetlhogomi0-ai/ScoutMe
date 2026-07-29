import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { useToast } from "../components/Toast";
import { UserProfile, ScoutReport, VirtualTrialResult } from "../types";
import { 
  Search, Trophy, Bot, Cpu, Bookmark, Sparkles, Send, CheckCircle2, History,
  Camera, Zap, RefreshCw, Play, Circle, PlayCircle, Star, Award, 
  ChevronRight, Activity, Smartphone, ArrowLeft, Share2
} from "lucide-react";
import { POSITION_BENCHMARKS, calculateRanking, getOverallRanking } from "../utils/benchmark";
import { generateAndShareReportCard } from "../utils/shareReport";

interface NeuralScoutAIProps {
  initialPlayerId?: string;
  onOpenPlayerProfile: (playerId: string) => void;
}

const DRILLS = [
  {
    id: "cone_slalom",
    name: "Cone Slalom",
    tag: "DRIBBLING / AGILITY",
    description: "Elegant dribble slalom through 5 cones spaced 1m apart.",
    impact: ["VISION", "PACE"],
    duration: 15,
    difficulty: "Medium",
    instructions: [
      "Set up 5 cones in a straight line, exactly 1m apart from each other.",
      "Start with the ball at the first cone.",
      "On the whistle, dribble in a slalom style between all cones and back.",
      "Perform as fast as possible without touching any cones."
    ]
  },
  {
    id: "sprint_30m",
    name: "30M Sprint",
    tag: "PACE / ACCELERATION",
    description: "Standing start 30-meter sprint between two markers.",
    impact: ["PACE"],
    duration: 15,
    difficulty: "Hard",
    instructions: [
      "Place a start marker and an end marker exactly 30 meters apart.",
      "Position your phone halfway (15m mark), capturing both start and finish lines.",
      "On the whistle, sprint from a standing start as fast as possible past the end marker."
    ]
  },
  {
    id: "cross_finish",
    name: "Cross & Finish",
    tag: "TECHNIQUE / ACCURACY",
    description: "Controlling a cross from the wing and scoring into an open goal.",
    impact: ["FINISHING"],
    duration: 15,
    difficulty: "Advanced",
    instructions: [
      "Set up a goal marker (or goalposts) and a ball-delivery station on the wing.",
      "Position the camera behind the penalty arc capturing the goal and control zone.",
      "On the whistle, receive a cross, control the ball, and strike into the net."
    ]
  }
];

export const NeuralScoutAI: React.FC<NeuralScoutAIProps> = ({ initialPlayerId, onOpenPlayerProfile }) => {
  const { users, generateReport, scoutReports, loading, currentUser, addVirtualTrialResult, addSystemNotification, toggleShortlist, shortlist } = useApp();
  const { showToast } = useToast();
  
  // Tab controller: "REPORT" for scouting report, "TRIAL" for virtual trial mode
  const [activeTab, setActiveTab] = useState<"REPORT" | "TRIAL">("REPORT");

  // Selector inputs for report tab
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(initialPlayerId || "");
  const [searchQuery, setSearchQuery] = useState("");

  // Report local cache for currently generated display
  const [activeReport, setActiveReport] = useState<ScoutReport | null>(null);
  const [typewriterText, setTypewriterText] = useState("");
  const [pulseLoading, setPulseLoading] = useState(false);
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);

  // Virtual Trial flow states
  const [trialStep, setTrialStep] = useState<"HOME" | "SETUP" | "RECORDING" | "DIAGNOSTICS" | "RESULTS">("HOME");
  const [selectedDrill, setSelectedDrill] = useState<typeof DRILLS[0] | null>(null);
  const [recordingTimer, setRecordingTimer] = useState(15);
  const [countdown, setCountdown] = useState(3);
  const [recordingState, setRecordingState] = useState<"COUNTDOWN" | "RECORDING" | "STOPPED">("STOPPED");
  const [diagnosticsProgress, setDiagnosticsProgress] = useState(0);
  const [generatedTrialResult, setGeneratedTrialResult] = useState<VirtualTrialResult | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // List of players
  const players = users.filter(u => u.role === "player");

  // Filter lists for players
  const filteredPlayers = players.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
    (p.position || "").toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  // Determine active color based on user role
  const playerRole = currentUser?.role || "player";
  const activeColor = playerRole === "player" ? "#00e56b" : playerRole === "scout" ? "#f5c518" : "#4da6ff";

  // Typewriter effect handler for Neural Scout report
  useEffect(() => {
    if (activeReport) {
      let charIndex = 0;
      setTypewriterText("");
      const textToType = activeReport.generatedReport;
      
      const interval = setInterval(() => {
        setTypewriterText((prev) => prev + textToType.charAt(charIndex));
        charIndex++;
        if (charIndex >= textToType.length) {
          clearInterval(interval);
        }
      }, 15);

      return () => clearInterval(interval);
    }
  }, [activeReport]);

  // Audio synthesizer beep helper (for recording countdowns)
  const playBeep = (freq = 800, duration = 0.25) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.type = "sine";
      
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (err) {
      console.warn("Audio Context beep failed", err);
    }
  };

  // Countdown and recording timer effect
  useEffect(() => {
    let interval: any = null;
    if (recordingState === "COUNTDOWN") {
      interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setRecordingState("RECORDING");
            setRecordingTimer(15);
            playBeep(800, 0.25); // Start Beep
            return 3;
          }
          playBeep(600, 0.1); // Tick beep
          return prev - 1;
        });
      }, 1000);
    } else if (recordingState === "RECORDING") {
      interval = setInterval(() => {
        setRecordingTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setRecordingState("STOPPED");
            // Whistle: short beep + long beep
            playBeep(1200, 0.15);
            setTimeout(() => playBeep(1200, 0.4), 180);
            
            // Auto transition to diagnostics
            handleStartDiagnostics();
            return 15;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [recordingState]);

  const handleStartDiagnostics = async () => {
    setTrialStep("DIAGNOSTICS");
    setDiagnosticsProgress(0);
    
    // Animate diagnostics progress
    const interval = setInterval(() => {
      setDiagnosticsProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          handleGenerateTrialResults();
          return 100;
        }
        return prev + 5;
      });
    }, 150);
  };

  const handleGenerateTrialResults = async () => {
    // Determine which player the trial is for
    const playerToScore = currentUser?.role === "player" 
      ? currentUser 
      : (users.find(u => u.userId === selectedPlayerId) || currentUser);
      
    if (!playerToScore) return;

    const positionKey = (playerToScore.position || "ST").toUpperCase();
    const benchmark = POSITION_BENCHMARKS[positionKey] || POSITION_BENCHMARKS["ST"];

    // Standard drill score between 75 and 95 representing high quality
    const baseScore = Math.floor(74 + Math.random() * 18); 
    
    // Map drill scores to physical attributes
    let pPace = playerToScore.pace || 80;
    let pVision = playerToScore.vision || 80;
    let pFinishing = playerToScore.finishing || 79;

    if (selectedDrill?.id === "cone_slalom") {
      pVision = Math.min(100, Math.floor(benchmark.vision + (baseScore - 75) * 0.4 + 5));
      pPace = Math.min(100, Math.floor(benchmark.pace + (baseScore - 75) * 0.3 + 5));
    } else if (selectedDrill?.id === "sprint_30m") {
      pPace = Math.min(100, Math.floor(benchmark.pace + (baseScore - 75) * 0.6 + 8));
    } else if (selectedDrill?.id === "cross_finish") {
      pFinishing = Math.min(100, Math.floor(benchmark.finishing + (baseScore - 75) * 0.6 + 8));
    }

    const calculatedTrialOverall = Math.floor((pPace + pVision + pFinishing) / 3);
    const overallRank = getOverallRanking({ pace: pPace, vision: pVision, finishing: pFinishing }, positionKey);
    const rankingText = overallRank?.label || "ABOVE AVERAGE";

    setTrialStep("RESULTS");
    setPulseLoading(true);

    try {
      const response = await fetch("/api/gemini/virtual-trial", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          player: playerToScore,
          drillName: selectedDrill?.name,
          trialScore: calculatedTrialOverall,
          paceScore: pPace,
          visionScore: pVision,
          finishingScore: pFinishing,
          benchmark: benchmark,
          ranking: rankingText
        })
      });
      const data = await response.json();
      setPulseLoading(false);
      
      setGeneratedTrialResult({
        drillName: selectedDrill?.name || "Cone Slalom",
        score: calculatedTrialOverall,
        paceScore: pPace,
        visionScore: pVision,
        finishingScore: pFinishing,
        ranking: rankingText,
        assessment: data.assessment,
        completedAt: new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })
      });
    } catch (err) {
      console.error("Failed to generate virtual trial assessment", err);
      setPulseLoading(false);
      // Fallback assessment
      setGeneratedTrialResult({
        drillName: selectedDrill?.name || "Cone Slalom",
        score: calculatedTrialOverall,
        paceScore: pPace,
        visionScore: pVision,
        finishingScore: pFinishing,
        ranking: rankingText,
        assessment: `During the ${selectedDrill?.name || "Cone Slalom"}, ${playerToScore.name} displayed excellent positional footwork and high mechanical efficiency. Their score of ${calculatedTrialOverall}/100 exceeds peer group benchmarks, with a highly competitive pace metric of ${pPace}/100. Continued technical drills will further solidify their prospects for professional recruitment within elite league setups.`,
        completedAt: new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })
      });
    }
  };

  const handleSaveToProfile = async () => {
    if (!generatedTrialResult) return;
    const playerToSave = currentUser?.role === "player" 
      ? currentUser 
      : (users.find(u => u.userId === selectedPlayerId) || currentUser);

    if (!playerToSave) return;
    setIsSavingProfile(true);
    try {
      await addVirtualTrialResult(playerToSave.userId, generatedTrialResult);
      showToast(`Virtual Trial pinned to ${playerToSave.name}'s profile ✦`, "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to pin Virtual Trial.", "error");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedPlayerId) return;
    
    const p = users.find(u => u.userId === selectedPlayerId);
    if (!p) return;

    setPulseLoading(true);
    setActiveReport(null);

    const reportObj = await generateReport(p.userId, {
      pace: p.pace || 80,
      vision: p.vision || 80,
      finishing: p.finishing || 80
    });

    setPulseLoading(false);
    if (reportObj) {
      setActiveReport(reportObj);
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

  const getRecColorPill = (rec?: string) => {
    switch (rec) {
      case "TRIAL RECOMMENDED":
        return "bg-[#00e56b]/15 text-[#00e56b] border border-[#00e56b]/35";
      case "MONITOR":
        return "bg-[#f5c518]/15 text-[#f5c518] border border-[#f5c518]/35";
      case "MORE DATA NEEDED":
        return "bg-[#4da6ff]/15 text-[#4da6ff] border border-[#4da6ff]/35";
      default:
        return "bg-[#5a8a6a]/15 text-[#5a8a6a] border border-[#5a8a6a]/35";
    }
  };

  // Determine target player for rendering trial view
  const activeTrialPlayer = currentUser?.role === "player" 
    ? currentUser 
    : (users.find(u => u.userId === selectedPlayerId) || currentUser);

  return (
    <div className="flex-1 pb-24 overflow-y-auto w-full no-scrollbar px-3 space-y-6">
      
      {/* HEADER */}
      <div>
        <h2 className="text-4xl font-extrabold tracking-wider font-bebas text-[#f5c518] uppercase">
          Neural Scout AI ◆
        </h2>
        <p className="text-xs text-[#5a8a6a] mt-0.5 font-medium uppercase font-mono">
          Proprietary Intelligence Analyzer
        </p>
      </div>

      {/* TABS SWITCHER */}
      <div className="flex border-b border-[#1a3825]">
        <button
          onClick={() => setActiveTab("REPORT")}
          className={`flex-1 text-center py-3 select-none transition text-xs font-black uppercase tracking-widest border-b-2 ${
            activeTab === "REPORT"
              ? "text-white"
              : "text-[#5a8a6a] border-transparent hover:text-white"
          }`}
          style={activeTab === "REPORT" ? { borderColor: activeColor } : {}}
        >
          SCOUT REPORT ◆
        </button>
        <button
          onClick={() => {
            setActiveTab("TRIAL");
            // Auto select first player if none is selected under scout/club view
            if (!selectedPlayerId && players.length > 0 && currentUser?.role !== "player") {
              setSelectedPlayerId(players[0].userId);
            }
          }}
          className={`flex-1 text-center py-3 select-none transition text-xs font-black uppercase tracking-widest border-b-2 ${
            activeTab === "TRIAL"
              ? "text-white"
              : "text-[#5a8a6a] border-transparent hover:text-white"
          }`}
          style={activeTab === "TRIAL" ? { borderColor: activeColor } : {}}
        >
          VIRTUAL TRIAL ⚡
        </button>
      </div>

      {/* TAB 1: REPORT GENERATION */}
      {activeTab === "REPORT" && (
        <div className="space-y-6">
          {/* EXPLANATION CARD AT TOP */}
          <div className="bg-[#0a1a0f] border-2 border-dashed border-[#00e56b]/40 p-5 rounded-2xl space-y-2.5 shadow-md">
            <div className="flex items-center space-x-2">
              <Cpu className="w-5 h-5 text-[#00e56b]" />
              <h3 className="text-sm font-black font-sans uppercase tracking-wider text-white">
                WHAT IS NEURAL SCOUT INTELLIGENCE?
              </h3>
            </div>
            <p className="text-[11.5px] text-[#5a8a6a] leading-relaxed font-sans">
              Our specialized AI engine compiles raw player clip performance, geographic trial statistics, metric coefficients, and eKasi community voting records. We synthesize professional scouting grades calibrated to elite PSL Academy standards.
            </p>
          </div>

          {/* PLAYER SELECTOR CONTROLS */}
          <div className="space-y-4">
            <h3 className="text-md font-extrabold tracking-wide font-bebas text-white uppercase">
              🛡️ Select Player to Analyze
            </h3>

            {/* Small in-grid search filter */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a8a6a]" />
              <input
                id="scout_player_search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search players by name, age, position..."
                className="w-full bg-[#0a1a0f] border border-[#1a3825] text-xs text-white pl-10 pr-4 py-2.5 rounded-xl placeholder-[#5a8a6a]/50"
              />
            </div>

            {/* Responsive horizontal list representation of players */}
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1 no-scrollbar border border-[#1a3825] p-3 rounded-xl bg-[#050e08]/50">
              {filteredPlayers.map((pl) => {
                const isSelected = selectedPlayerId === pl.userId;
                return (
                  <div
                    key={pl.userId}
                    onClick={() => setSelectedPlayerId(pl.userId)}
                    className={`p-3 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "bg-[#231e0f] border-[#f5c518] shadow-lg shadow-[#f5c518]/5"
                        : "bg-[#0a1a0f] border-[#1a3825] hover:border-[#1a3825]/80"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl bg-[#050e08]/60 p-1 rounded-lg">{getStoryEmoji(pl.name)}</span>
                      <div>
                        <h4 className="text-white text-xs font-bold font-sans flex items-center space-x-2">
                          <span>{pl.name}</span>
                          <span className="text-[9px] text-[#00e56b] bg-[#0f2318] px-1 rounded border border-[#1a3825]">
                            {pl.position}
                          </span>
                        </h4>
                        <p className="text-[10px] text-[#5a8a6a] mt-0.5">Age {pl.age} · {pl.club || "Unattached"}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3.5">
                      <div className="text-right">
                        <span className="text-[9px] text-[#5a8a6a] block uppercase font-mono">AI RATING</span>
                        <span className="text-xs font-bold text-[#f5c518] font-mono">{pl.rating || 82}</span>
                      </div>
                      <input
                        id={`radio_select_${pl.userId}`}
                        type="radio"
                        name="scout_player_select"
                        checked={isSelected}
                        onChange={() => setSelectedPlayerId(pl.userId)}
                        className="w-4 h-4 accent-[#f5c518] cursor-pointer"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* GENERATE BUTTON */}
          <div>
            <button
              id="generate_intelligence_report_btn"
              disabled={!selectedPlayerId || pulseLoading || loading}
              onClick={handleGenerate}
              className="w-full py-4 text-xs font-extrabold uppercase bg-[#f5c518] text-[#050e08] rounded-xl shadow-lg transition disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#e4b510]"
            >
              {pulseLoading ? "◆ ANALYSING PLAYER VIDEO FOOTAGE..." : "◆ GENERATE NEURAL SCOUT REPORT"}
            </button>
          </div>

          {/* Pulse loading skeleton state */}
          {pulseLoading && (
            <div className="bg-[#0a1a0f] border border-[#1a3825] rounded-xl p-6 text-center space-y-4 animate-pulse">
              <Bot className="w-12 h-12 text-[#f5c518] mx-auto animate-bounce" />
              <p className="text-xs text-[#5a8a6a] uppercase font-mono tracking-widest">
                Simulating Neural Frame Diagnostics... Complete in 2s
              </p>
            </div>
          )}

          {/* GENERATED REPORT CARD */}
          {activeReport && (
            <div className="bg-[#0a1a0f] border border-[#1a3825] rounded-2xl overflow-hidden shadow-2xl border-t-4 border-t-[#f5c518] animate-in slide-in-from-bottom-5 duration-300">
              {/* Header */}
              <div className="p-4 bg-[#050e08]/60 flex items-center justify-between border-b border-[#1a3825]">
                <div className="space-y-0.5">
                  <span className="text-[9.5px] font-extrabold uppercase font-mono text-[#f5c518] tracking-widest block">
                    ◆ Neural Scout Report
                  </span>
                  <h4 className="text-white text-lg font-bold font-sans">
                    {activeReport.playerName}
                  </h4>
                </div>
                <span className="text-[9px] text-[#5a8a6a] font-mono">{activeReport.createdAt}</span>
              </div>

              {/* Core score circle */}
              <div className="p-5 flex flex-col items-center justify-center space-y-4 border-b border-[#1a3825]/40 bg-[#050e08]/30">
                <div className="relative w-28 h-28 rounded-full border-4 border-dashed border-[#f5c518] flex flex-col items-center justify-center shadow-xl">
                  <span className="text-3xl font-black text-[#f5c518] font-mono tracking-tighter">
                    {activeReport.overallScore}
                  </span>
                  <span className="text-[9px] text-[#5a8a6a] font-bold uppercase tracking-wide">
                    AI Rating
                  </span>
                </div>

                <div className={`px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-widest ${getRecColorPill(activeReport.recommendation)}`}>
                  {activeReport.recommendation}
                </div>
              </div>

              {/* Stat breakdown list */}
              <div className="p-4.5 space-y-3.5 border-b border-[#1a3825]/40">
                <h5 className="text-xs font-bold text-[#5a8a6a] uppercase tracking-wider">Metrics breakdowns</h5>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#050e08] p-2.5 rounded-lg text-center border border-[#1a3825]">
                    <span className="block text-[8.5px] text-[#5a8a6a] font-bold uppercase">PACE</span>
                    <span className="text-sm font-bold text-[#00e56b] font-mono">{activeReport.paceScore}/100</span>
                  </div>
                  <div className="bg-[#050e08] p-2.5 rounded-lg text-center border border-[#1a3825]">
                    <span className="block text-[8.5px] text-[#5a8a6a] font-bold uppercase">VISION</span>
                    <span className="text-sm font-bold text-[#f5c518] font-mono">{activeReport.visionScore}/100</span>
                  </div>
                  <div className="bg-[#050e08] p-2.5 rounded-lg text-center border border-[#1a3825]">
                    <span className="block text-[8.5px] text-[#5a8a6a] font-bold uppercase">FINISHING</span>
                    <span className="text-sm font-bold text-[#4da6ff] font-mono">{activeReport.finishingScore}/100</span>
                  </div>
                </div>
              </div>

              {/* POSITION BENCHMARK SECTION */}
              {(() => {
                const reportPlayer = users.find(u => u.userId === activeReport.playerId);
                const positionKey = (reportPlayer?.position || "ST").toUpperCase();
                const benchmark = POSITION_BENCHMARKS[positionKey] || POSITION_BENCHMARKS["ST"];

                const paceRank = calculateRanking(activeReport.paceScore, benchmark.pace);
                const visionRank = calculateRanking(activeReport.visionScore, benchmark.vision);
                const finishingRank = calculateRanking(activeReport.finishingScore, benchmark.finishing);
                const overallRank = getOverallRanking({
                  pace: activeReport.paceScore,
                  vision: activeReport.visionScore,
                  finishing: activeReport.finishingScore
                }, positionKey);

                return (
                  <div className="mx-4.5 my-4 p-4 bg-[#0a1a0f] border-t-2 border-t-[#f5c518] rounded-xl space-y-3.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black tracking-[2px] text-[#f5c518] font-sans">
                        POSITION BENCHMARK ◆
                      </span>
                      <span className="text-[10px] text-[#5a8a6a] font-medium font-mono">
                        vs. all {positionKey}s on ScoutMe
                      </span>
                    </div>

                    {/* Benchmark rows */}
                    <div className="space-y-2.5">
                      {/* PACE */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-[#e8f5ee] w-16">PACE</span>
                          <span className="text-[#5a8a6a] font-mono">Your score: <strong className="text-white">{activeReport.paceScore}</strong></span>
                          <span className="text-[#5a8a6a] font-mono">vs avg: {benchmark.pace}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase text-[#050e08]" style={{ backgroundColor: paceRank.color }}>
                          {paceRank.badge}
                        </span>
                      </div>

                      {/* VISION */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-[#e8f5ee] w-16">VISION</span>
                          <span className="text-[#5a8a6a] font-mono">Your score: <strong className="text-white">{activeReport.visionScore}</strong></span>
                          <span className="text-[#5a8a6a] font-mono">vs avg: {benchmark.vision}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase text-[#050e08]" style={{ backgroundColor: visionRank.color }}>
                          {visionRank.badge}
                        </span>
                      </div>

                      {/* FINISHING */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-[#e8f5ee] w-16">FINISHING</span>
                          <span className="text-[#5a8a6a] font-mono">Your score: <strong className="text-white">{activeReport.finishingScore}</strong></span>
                          <span className="text-[#5a8a6a] font-mono">vs avg: {benchmark.finishing}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase text-[#050e08]" style={{ backgroundColor: finishingRank.color }}>
                          {finishingRank.badge}
                        </span>
                      </div>
                    </div>

                    {/* Overall Ranking banner */}
                    {overallRank && (
                      <div className="space-y-2">
                        <div className="w-full py-2 px-3 rounded-lg text-[11px] font-black uppercase text-[#050e08] text-center" style={{ backgroundColor: overallRank.color }}>
                          OVERALL: You are in the {overallRank.percentile} of {benchmark.label}s on ScoutMe
                        </div>
                        <p className="text-[10.5px] text-[#5a8a6a] italic leading-tight text-center">
                          "{overallRank.percentile === "top 5%" ? "Elite level. Professional clubs are actively searching for players at your level." :
                            overallRank.percentile === "top 10%" ? "Outstanding prospect. You belong in a higher league." :
                            overallRank.percentile === "top 25%" ? "Strong performer. Keep pushing — you are close to elite level." :
                            overallRank.percentile === "top 50%" ? "On the right track. Consistent training will move you up the rankings." :
                            "Every elite player started here. Your journey is just beginning."}"
                        </p>
                      </div>
                    )}

                    <p className="text-[9.5px] text-[#5a8a6a]/60 text-center font-sans mt-1">
                      🔄 Rankings update weekly based on new players joining ScoutMe
                    </p>
                  </div>
                );
              })()}

              {/* Typewrite Report Text */}
              <div className="p-5 space-y-3">
                <h5 className="text-[10px] font-mono text-[#5a8a6a] uppercase">TECHNICAL SCRIBE ANALYTICS</h5>
                <div className="bg-[#050e08] p-4 rounded-xl border border-[#1a3825]/85 relative">
                  <p className="text-xs text-[#e8f5ee] leading-relaxed font-sans select-all">
                    {typewriterText}
                    <span className="inline-block w-1.5 h-3.5 bg-[#00e56b] ml-0.5 animate-pulse" />
                  </p>
                </div>
              </div>

              {/* Action Row */}
              <div className="p-4 bg-[#050e08]/60 grid grid-cols-3 gap-2.5 border-b border-[#1a3825]/40">
                <button
                  onClick={() => {
                    if (activeReport) {
                      const isShortlisted = shortlist.includes(activeReport.playerId);
                      if (!isShortlisted) {
                        toggleShortlist(activeReport.playerId);
                      }
                      showToast("Report saved ✦", "success");
                    } else {
                      showToast("No active report compiled to save.", "error");
                    }
                  }}
                  className="py-2.5 bg-[#f5c518] text-[#050e08] rounded-lg text-[10px] font-bold uppercase tracking-wider text-center"
                >
                  Save Report
                </button>
                <button
                  onClick={() => {
                    if (activeReport) {
                      const dossierUrl = `https://scoutme.org/report/${activeReport.reportId}`;
                      navigator.clipboard.writeText(dossierUrl).catch(() => {});
                      showToast("Shared with your club shortlist ✦", "success");
                    } else {
                      showToast("No active report compiled to share.", "error");
                    }
                  }}
                  className="py-2.5 bg-[#0a1a0f] border border-[#1a3825] text-white rounded-lg text-[10px] font-bold uppercase tracking-wider text-center"
                >
                  Share Club
                </button>
                <button 
                  onClick={() => {
                    if (activeReport) {
                      addSystemNotification(
                        activeReport.playerId,
                        `⚡ Direct Trial Proposed! Scout ${currentUser?.name || "Verified Scout"} from ${currentUser?.organisation || "Independent Scouting"} has proposed a direct trial. Open your inbox for scheduling.`
                      );
                      showToast(`Trial request sent to ${activeReport.playerName} ✦`, "success");
                    } else {
                      showToast("No active report compiled to request trial.", "error");
                    }
                  }}
                  className="py-2.5 bg-[#00e56b] text-[#050e08] rounded-lg text-[10px] font-bold uppercase tracking-wider text-center"
                >
                  Request Trial
                </button>
              </div>

              {/* Share Section */}
              <div className="p-4 bg-[#050e08]/80">
                <button
                  onClick={() => {
                    const p = users.find(u => u.userId === activeReport.playerId) || {
                      name: activeReport.playerName,
                      position: "ST",
                      province: "Gauteng",
                      userId: activeReport.playerId
                    };
                    generateAndShareReportCard(p, {
                      overallScore: activeReport.overallScore,
                      paceScore: activeReport.paceScore,
                      visionScore: activeReport.visionScore,
                      finishingScore: activeReport.finishingScore,
                      generatedReport: activeReport.generatedReport
                    }, setIsGeneratingCard);
                  }}
                  disabled={isGeneratingCard}
                  className="w-full bg-[#00e56b] hover:bg-[#00c75c] disabled:opacity-50 text-[#050e08] py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition active:scale-95 flex items-center justify-center space-x-2 shadow-lg cursor-pointer"
                >
                  {isGeneratingCard ? (
                    <span className="animate-pulse">◆ GENERATING CARD...</span>
                  ) : (
                    <span>📤 SHARE MY SCOUT REPORT</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* HISTORIC SCOUTING DIRECTORY */}
          <div className="space-y-3.5 pt-4">
            <h3 className="text-lg font-bebas font-extrabold text-[#5a8a6a] tracking-wider uppercase flex items-center space-x-2">
              <History className="w-5 h-5" />
              <span>⏮️ Generated Reports Archives</span>
            </h3>

            {scoutReports.length === 0 ? (
              <p className="text-xs text-[#5a8a6a] italic bg-[#0a1a0f] p-4.5 rounded-xl border border-[#1a3825]">
                No previously generated reports stored. Run analysis on a player from the selection list.
              </p>
            ) : (
              <div className="space-y-3">
                {scoutReports.map((rep) => (
                  <div
                    key={rep.reportId}
                    onClick={() => {
                      setActiveReport(rep);
                      setTypewriterText(rep.generatedReport);
                    }}
                    className="bg-[#0a1a0f] border border-[#1a3825] p-3.5 rounded-xl flex items-center justify-between cursor-pointer hover:border-[#f5c518]/50 transition"
                  >
                    <div>
                      <h4 className="text-white text-xs font-bold font-sans">{rep.playerName}</h4>
                      <p className="text-[10px] text-[#5a8a6a] mt-0.5">GRADE overall: {rep.overallScore}/100 · {rep.createdAt.split("·")[0]}</p>
                    </div>
                    <div className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase font-mono ${getRecColorPill(rep.recommendation)}`}>
                      {rep.recommendation.split(" ")[0]}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: VIRTUAL TRIAL SYSTEM */}
      {activeTab === "TRIAL" && (
        <div className="space-y-6">
          
          {/* VIRTUAL TRIAL - HOME (DRILL SELECTOR) */}
          {trialStep === "HOME" && (
            <div className="space-y-5 animate-in fade-in duration-300">
              
              {/* Introduction Banner */}
              <div className="bg-[#0a1a0f] border border-[#1a3825] p-5 rounded-2xl relative overflow-hidden shadow-lg border-l-4 border-l-[#00e56b]">
                <div className="flex items-center space-x-2 mb-2">
                  <Zap className="w-5 h-5 text-[#00e56b] animate-pulse" />
                  <h3 className="text-sm font-black tracking-wider text-white uppercase font-sans">
                    ScoutMe Standardized Virtual Trials
                  </h3>
                </div>
                <p className="text-[11.5px] text-[#5a8a6a] leading-relaxed font-sans">
                  Completed on your phone inside our automated viewport. We overlay computer-vision skeleton nodes and score your acceleration, agile slalom transitions, and scoring technique against standardized position benchmarks trusted by technical PSL scouts.
                </p>
              </div>

              {/* Scout View / Player Selector if Scout or Club is logged in */}
              {(currentUser?.role === "scout" || currentUser?.role === "club") && (
                <div className="bg-[#1c1404]/20 border border-[#f5c518]/30 p-4 rounded-xl space-y-3">
                  <span className="text-[10px] text-[#f5c518] font-bold tracking-wider uppercase block">
                    🛡️ PROFESSIONAL COCHING/SCOUT INGRESS CONTROL
                  </span>
                  <p className="text-[11px] text-[#5a8a6a]">
                    Select a player from the network to inspect their completed trial reports or run a localized calibration simulation.
                  </p>
                  
                  <div className="flex space-x-2">
                    <select
                      value={selectedPlayerId}
                      onChange={(e) => setSelectedPlayerId(e.target.value)}
                      className="flex-1 bg-[#050e08] border border-[#1a3825] text-xs text-stone-200 p-2.5 rounded-lg focus:outline-none"
                    >
                      {players.map(p => (
                        <option key={p.userId} value={p.userId}>{p.name} ({p.position})</option>
                      ))}
                    </select>
                  </div>

                  {activeTrialPlayer?.virtualTrial && (
                    <div className="bg-[#050e08] border border-[#1a3825] p-3 rounded-lg flex items-center justify-between">
                      <div>
                        <span className="text-[9px] text-[#00e56b] bg-[#0f2318] px-1.5 py-0.5 rounded border border-[#1a3825]/40 font-mono font-bold">
                          ⚡ TRIAL ACTIVE
                        </span>
                        <h4 className="text-xs font-bold text-white mt-1.5">{activeTrialPlayer.virtualTrial.drillName}</h4>
                        <p className="text-[10px] text-[#5a8a6a]">Overall score: {activeTrialPlayer.virtualTrial.score}/100 · {activeTrialPlayer.virtualTrial.completedAt}</p>
                      </div>
                      <button
                        onClick={() => {
                          setGeneratedTrialResult(activeTrialPlayer.virtualTrial || null);
                          setTrialStep("RESULTS");
                        }}
                        className="bg-[#f5c518] text-[#050e08] px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider"
                      >
                        View Assessment
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Display Drill Choices Grid */}
              <div className="space-y-3.5">
                <h3 className="text-sm font-extrabold tracking-wide text-[#5a8a6a] uppercase flex items-center space-x-1.5">
                  <Activity className="w-4 h-4 text-[#00e56b]" />
                  <span>Choose Your Drill Standard</span>
                </h3>

                <div className="grid grid-cols-1 gap-3">
                  {DRILLS.map((drill) => (
                    <div
                      key={drill.id}
                      className="bg-[#0a1a0f] border border-[#1a3825] hover:border-[#00e56b]/50 p-4 rounded-xl transition flex flex-col justify-between"
                    >
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-mono text-[#00e56b] bg-[#0f2318] px-2 py-0.5 rounded border border-[#1a3825]/60">
                            {drill.tag}
                          </span>
                          <span className="text-[10px] text-[#5a8a6a] font-medium">Difficulty: <strong className="text-white">{drill.difficulty}</strong></span>
                        </div>
                        <h4 className="text-white text-md font-bold font-sans">{drill.name}</h4>
                        <p className="text-[11.5px] text-[#5a8a6a] leading-relaxed">{drill.description}</p>
                        
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {drill.impact.map((imp) => (
                            <span key={imp} className="text-[9px] font-mono bg-[#050e08] text-white/75 px-1.5 py-0.5 rounded border border-[#1a3825]">
                              +{imp} STAT WEIGHT
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedDrill(drill);
                          setTrialStep("SETUP");
                        }}
                        className="mt-4 w-full py-2.5 bg-[#050e08] border border-[#00e56b]/40 text-[#00e56b] hover:bg-[#00e56b]/10 text-[10px] font-black uppercase tracking-widest rounded-lg transition"
                      >
                        ⚡ START DRILL SETUP
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIRTUAL TRIAL - SETUP (CALIBRATION DIAGRAM) */}
          {trialStep === "SETUP" && selectedDrill && (
            <div className="space-y-5 animate-in slide-in-from-right-5 duration-300">
              
              <div className="flex items-center space-x-2.5">
                <button
                  onClick={() => setTrialStep("HOME")}
                  className="p-1 text-[#5a8a6a] hover:text-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h3 className="text-lg font-extrabold text-white font-bebas uppercase tracking-wider">
                    📐 {selectedDrill.name} Calibration Guide
                  </h3>
                  <p className="text-[10px] text-[#5a8a6a] font-mono uppercase">Calibration Standards</p>
                </div>
              </div>

              {/* MOCK CALIBRATION DIAGRAM IN BEAUTIFUL CSS DRAWING */}
              <div className="bg-[#050e08] border border-[#1a3825] rounded-2xl p-4.5 aspect-video relative flex flex-col items-center justify-between overflow-hidden">
                <div className="absolute top-2 left-2 text-[8px] font-mono text-[#5a8a6a]/60 uppercase">CALIBRATION DEPTH FIELD: 15m</div>
                
                {/* Visual Field Layout Grid Lines */}
                <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-0 border-t border-dashed border-[#1a3825]/40 w-[90%] mx-auto" />
                
                {/* Vertical field markers */}
                <div className="absolute left-10 top-1/4 bottom-1/4 border-l border-dashed border-[#1a3825]/30" />
                <div className="absolute right-10 top-1/4 bottom-1/4 border-r border-dashed border-[#1a3825]/30" />

                {/* Draw 1.5m phone tripod left side */}
                <div className="absolute left-6 bottom-4 flex flex-col items-center">
                  <div className="w-1.5 h-3 bg-[#f5c518] rounded" /> {/* phone */}
                  <div className="w-0.5 h-10 bg-stone-500" /> {/* pole */}
                  <div className="flex space-x-1.5 -mt-0.5">
                    <div className="w-0.5 h-3 bg-stone-500 origin-top rotate-12" />
                    <div className="w-0.5 h-3 bg-stone-500 origin-top -rotate-12" />
                  </div>
                  <span className="text-[7.5px] font-mono text-[#f5c518] mt-1">CAMERA: 1.5m</span>
                </div>

                {/* Draw Cones aligned in middle */}
                <div className="absolute inset-x-20 bottom-8 flex justify-around">
                  {[1, 2, 3, 4, 5].map((idx) => (
                    <div key={idx} className="flex flex-col items-center animate-bounce" style={{ animationDelay: `${idx * 150}ms` }}>
                      {/* Cone shape */}
                      <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[12px] border-b-[#00e56b]" />
                      <div className="w-3.5 h-1 bg-[#00e56b] rounded-full -mt-0.5" />
                    </div>
                  ))}
                </div>

                {/* Player silhouette indicator right side */}
                <div className="absolute right-12 bottom-6 flex flex-col items-center">
                  <span className="text-xl">🏃🏾‍♂️</span>
                  <span className="text-[7.5px] font-mono text-[#00e56b] mt-0.5">PLAYER</span>
                </div>

                <div className="text-center w-full z-10 bg-[#0a1a0f]/90 border border-[#1a3825] py-2.5 px-3 rounded-xl max-w-xs mt-auto">
                  <p className="text-[10px] text-white/95 font-sans leading-tight font-medium">
                    🔍 Place phone vertically. Cones and starting point must be fully visible.
                  </p>
                </div>
              </div>

              {/* Instructions List */}
              <div className="bg-[#0a1a0f] border border-[#1a3825] p-4.5 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Required Steps:</h4>
                <ul className="space-y-2">
                  {selectedDrill.instructions.map((inst, idx) => (
                    <li key={idx} className="flex items-start space-x-2.5 text-xs text-[#5a8a6a] leading-relaxed">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#050e08] border border-[#1a3825] text-[9.5px] font-bold text-[#00e56b]">
                        {idx + 1}
                      </span>
                      <span>{inst}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Trigger button */}
              <button
                onClick={() => {
                  setTrialStep("RECORDING");
                  setCountdown(3);
                  setRecordingState("COUNTDOWN");
                  playBeep(600, 0.1); // Initial tick beep
                }}
                className="w-full py-4 bg-[#00e56b] hover:bg-[#00c75c] text-[#050e08] rounded-xl font-bold text-xs uppercase tracking-widest transition flex items-center justify-center space-x-2 cursor-pointer shadow-lg"
              >
                <Camera className="w-4 h-4" />
                <span>📷 OPEN CAMERA & START DRILL</span>
              </button>
            </div>
          )}

          {/* VIRTUAL TRIAL - CAMERA VIEWPORT */}
          {trialStep === "RECORDING" && selectedDrill && (
            <div className="space-y-5 animate-in fade-in duration-300">
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-md font-extrabold text-white font-sans uppercase tracking-wide">
                    📷 Virtual Viewfinder active
                  </h3>
                  <p className="text-[9px] text-[#5a8a6a] font-mono uppercase tracking-widest">{selectedDrill.name} · calibrating...</p>
                </div>
                <div className="flex items-center space-x-1.5 text-xs font-mono font-bold bg-[#1a0a0f] border border-[#ff4444]/30 text-[#ff4444] px-2 py-0.5 rounded-full animate-pulse">
                  <span className="w-2 h-2 bg-[#ff4444] rounded-full" />
                  <span>● LIVE REC</span>
                </div>
              </div>

              {/* SIMULATED CAMERA VIEWPORT CONTAINER */}
              <div className="aspect-video w-full bg-[#050e08] border-2 border-dashed border-[#1a3825] rounded-2xl overflow-hidden relative flex flex-col items-center justify-center">
                
                {/* Thin camera overlay grid lines */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                  <div className="border-r border-b border-[#1a3825]/20" />
                  <div className="border-r border-b border-[#1a3825]/20" />
                  <div className="border-b border-[#1a3825]/20" />
                  <div className="border-r border-b border-[#1a3825]/20" />
                  <div className="border-r border-b border-[#1a3825]/20" />
                  <div className="border-b border-[#1a3825]/20" />
                  <div className="border-r border-[#1a3825]/20" />
                  <div className="border-r border-[#1a3825]/20" />
                  <div className="border-transparent" />
                </div>

                {/* Mock phone gyroscope angle level indicator */}
                <div className="absolute top-3 left-3 bg-black/60 border border-[#1a3825] px-2.5 py-1 rounded-md text-[8.5px] font-mono font-bold text-[#00e56b] flex items-center space-x-1.5 z-20">
                  <Smartphone className="w-3 h-3" />
                  <span>LEVEL: CALIBRATED 0.0°</span>
                </div>

                {/* COUNTDOWN TIMERS */}
                <div className="absolute top-3 right-3 bg-black/60 border border-[#1a3825] px-3 py-1 rounded-md text-[11px] font-mono font-black text-white z-20">
                  TIMER: 00:{recordingTimer < 10 ? `0${recordingTimer}` : recordingTimer}
                </div>

                {/* BIG INITIAL COUNTDOWN OVERLAY */}
                {recordingState === "COUNTDOWN" && (
                  <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-30 animate-in fade-in duration-200">
                    <span className="text-[10px] text-[#f5c518] font-bold tracking-widest font-mono uppercase mb-2">Get ready at start line...</span>
                    <span className="text-7xl font-black font-bebas text-white animate-ping">
                      {countdown}
                    </span>
                  </div>
                )}

                {/* REELING SIMULATED SKELETAL VIDEO FOOTAGE OVERLAY */}
                {recordingState === "RECORDING" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    
                    {/* Simulated skeletal lines representing OpenPose player tracking */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-32 pointer-events-none">
                      <svg className="w-full h-full text-[#00e56b] opacity-80" viewBox="0 0 100 100">
                        {/* Moving skeleton profile running between dots */}
                        <g className="animate-pulse">
                          {/* head */}
                          <circle cx="50" cy="20" r="4" fill="currentColor" />
                          {/* torso */}
                          <line x1="50" y1="24" x2="52" y2="50" stroke="currentColor" strokeWidth="2" />
                          {/* left arm */}
                          <line x1="50" y1="28" x2="38" y2="40" stroke="currentColor" strokeWidth="2" />
                          <line x1="38" y1="40" x2="28" y2="38" stroke="currentColor" strokeWidth="2" />
                          {/* right arm */}
                          <line x1="50" y1="28" x2="62" y2="35" stroke="currentColor" strokeWidth="2" />
                          <line x1="62" y1="35" x2="68" y2="48" stroke="currentColor" strokeWidth="2" />
                          {/* left leg */}
                          <line x1="52" y1="50" x2="42" y2="72" stroke="currentColor" strokeWidth="2" />
                          <line x1="42" y1="72" x2="48" y2="90" stroke="currentColor" strokeWidth="2" />
                          {/* right leg */}
                          <line x1="52" y1="50" x2="60" y2="70" stroke="currentColor" strokeWidth="2" />
                          <line x1="60" y1="70" x2="55" y2="90" stroke="currentColor" strokeWidth="2" />

                          {/* glowing joint dots */}
                          <circle cx="52" cy="50" r="2.5" fill="#f5c518" />
                          <circle cx="42" cy="72" r="2.5" fill="#f5c518" />
                          <circle cx="60" cy="70" r="2.5" fill="#f5c518" />
                        </g>

                        {/* Slalom course path guide */}
                        <path d="M 20 85 Q 35 70 50 85 T 80 85" fill="none" stroke="rgba(245, 197, 24, 0.4)" strokeWidth="1.5" strokeDasharray="4 4" />
                      </svg>
                    </div>

                    {/* Frame trackers indicators text */}
                    <div className="absolute bottom-3 left-3 bg-black/60 border border-[#1a3825] px-2 py-1 rounded text-[7.5px] font-mono text-stone-300 uppercase space-y-0.5">
                      <div>FRAME NODES: 18 ACTIVE</div>
                      <div>PROXIMITY: OPTIMAL (10.2m)</div>
                    </div>

                    <div className="absolute bottom-3 right-3 bg-[#00e56b]/15 text-[#00e56b] border border-[#00e56b]/35 px-2 py-1 rounded text-[8px] font-mono font-bold uppercase animate-pulse">
                      ⚡ STREAMING DIAGNOSTICS...
                    </div>
                  </div>
                )}

                {/* Fallback Viewport Content when stopped */}
                {recordingState === "STOPPED" && (
                  <div className="text-center p-4">
                    <Trophy className="w-10 h-10 text-[#5a8a6a] mx-auto animate-bounce mb-2" />
                    <p className="text-xs text-[#5a8a6a]">Simulated Lens Frame Locked.</p>
                  </div>
                )}

              </div>

              {/* STOP ACTION CONTROLS */}
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setRecordingState("STOPPED");
                    setTrialStep("SETUP");
                  }}
                  className="flex-1 py-3 bg-[#0a1a0f] border border-[#1a3825] text-white rounded-xl text-xs font-bold uppercase tracking-wider"
                >
                  Cancel Test
                </button>
                <button
                  onClick={() => {
                    setRecordingState("STOPPED");
                    // Play end whistle
                    playBeep(1200, 0.15);
                    setTimeout(() => playBeep(1200, 0.4), 180);
                    handleStartDiagnostics();
                  }}
                  disabled={recordingState !== "RECORDING"}
                  className="flex-1 py-3 bg-[#ff4444] disabled:opacity-40 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Stop & Process Report
                </button>
              </div>

            </div>
          )}

          {/* VIRTUAL TRIAL - NEURAL FRAME DIAGNOSTICS (LOADER) */}
          {trialStep === "DIAGNOSTICS" && selectedDrill && (
            <div className="bg-[#0a1a0f] border border-[#1a3825] rounded-2xl p-8 text-center space-y-6 animate-pulse duration-1000">
              <Bot className="w-16 h-16 text-[#00e56b] mx-auto animate-bounce" />
              
              <div className="space-y-1">
                <h3 className="text-lg font-extrabold text-white font-bebas uppercase tracking-wider">
                  Neural Frame Diagnostics Running
                </h3>
                <p className="text-[9.5px] text-[#5a8a6a] font-mono uppercase tracking-widest">
                  Analyzing calibration skeletons nodes...
                </p>
              </div>

              {/* Diagnostic progress metrics bar */}
              <div className="space-y-1.5 max-w-sm mx-auto">
                <div className="flex justify-between text-[10px] text-[#5a8a6a] font-bold font-mono">
                  <span>ANALYSIS CALIBRATION</span>
                  <span>{diagnosticsProgress}%</span>
                </div>
                <div className="h-2.5 bg-[#050e08] rounded-full overflow-hidden border border-[#1a3825]">
                  <div 
                    className="h-full bg-[#00e56b] transition-all duration-150 ease-out"
                    style={{ width: `${diagnosticsProgress}%` }}
                  />
                </div>
              </div>

              {/* Diagnostics micro logging points list */}
              <div className="bg-[#050e08] p-4 rounded-xl border border-[#1a3825]/80 text-left space-y-2 max-w-sm mx-auto font-mono text-[9px]">
                <div className="flex items-center space-x-2 text-[#00e56b]">
                  <span className="text-[#00e56b] animate-ping">●</span>
                  <span>STATUS: compiling skeletal motion arrays...</span>
                </div>
                {diagnosticsProgress >= 25 && (
                  <div className="text-stone-300">✔ SCANNING: skeleton nodes localized (18 joints tracking)...</div>
                )}
                {diagnosticsProgress >= 50 && (
                  <div className="text-stone-300">✔ VELOCITY: stride length velocity diagnostics completed...</div>
                )}
                {diagnosticsProgress >= 75 && (
                  <div className="text-[#f5c518] font-bold">◆ INTEGRATION: comparing against {activeTrialPlayer?.position || 'CAM'} benchmarks...</div>
                )}
              </div>
            </div>
          )}

          {/* VIRTUAL TRIAL - RESULTS CARD */}
          {trialStep === "RESULTS" && generatedTrialResult && (
            <div className="space-y-6 animate-in slide-in-from-bottom-5 duration-300">
              
              {/* Congratulations header */}
              <div className="text-center space-y-1">
                <span className="text-3xl">🎉</span>
                <h3 className="text-2xl font-black text-white font-bebas tracking-wide uppercase">
                  Trial Assessment Compiled!
                </h3>
                <p className="text-xs text-[#5a8a6a] font-sans">
                  Neural Scout Intelligence successfully calculated your metric coefficients.
                </p>
              </div>

              {/* Main Results Display Card */}
              <div className="bg-[#0a1a0f] border border-[#1a3825] rounded-2xl overflow-hidden shadow-2xl border-t-4 border-t-[#00e56b]">
                
                {/* Header info */}
                <div className="p-4 bg-[#050e08]/60 flex items-center justify-between border-b border-[#1a3825]">
                  <div className="space-y-0.5">
                    <span className="text-[9.5px] font-extrabold uppercase font-mono text-[#00e56b] tracking-widest block">
                      ⚡ VIRTUAL TRIAL RESULT ◆
                    </span>
                    <h4 className="text-white text-md font-bold font-sans">
                      {activeTrialPlayer?.name}
                    </h4>
                  </div>
                  <span className="text-[9px] text-[#5a8a6a] font-mono">{generatedTrialResult.completedAt}</span>
                </div>

                {/* Score Circle Hero */}
                <div className="p-5 flex flex-col items-center justify-center space-y-4 border-b border-[#1a3825]/40 bg-[#050e08]/30">
                  <div className="relative w-28 h-28 rounded-full border-4 border-dashed border-[#00e56b] flex flex-col items-center justify-center shadow-xl">
                    <span className="text-3xl font-black text-[#00e56b] font-mono tracking-tighter">
                      {generatedTrialResult.score}
                    </span>
                    <span className="text-[9px] text-[#5a8a6a] font-bold uppercase tracking-wide">
                      DRILL GRADE
                    </span>
                  </div>

                  <span className="px-3.5 py-1 bg-[#00e56b]/15 text-[#00e56b] border border-[#00e56b]/35 rounded-full text-[10.5px] font-black uppercase tracking-wider">
                    {selectedDrill?.name || generatedTrialResult.drillName} completed
                  </span>
                </div>

                {/* Skill Breakdowns */}
                <div className="p-4.5 space-y-3.5 border-b border-[#1a3825]/40">
                  <h5 className="text-xs font-bold text-[#5a8a6a] uppercase tracking-wider">Metric Updates Affected</h5>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-[#050e08] p-2.5 rounded-lg text-center border border-[#1a3825]">
                      <span className="block text-[8.5px] text-[#5a8a6a] font-bold uppercase">PACE</span>
                      <span className="text-sm font-bold text-[#00e56b] font-mono">{generatedTrialResult.paceScore}/100</span>
                    </div>
                    <div className="bg-[#050e08] p-2.5 rounded-lg text-center border border-[#1a3825]">
                      <span className="block text-[8.5px] text-[#5a8a6a] font-bold uppercase">VISION</span>
                      <span className="text-sm font-bold text-[#f5c518] font-mono">{generatedTrialResult.visionScore}/100</span>
                    </div>
                    <div className="bg-[#050e08] p-2.5 rounded-lg text-center border border-[#1a3825]">
                      <span className="block text-[8.5px] text-[#5a8a6a] font-bold uppercase">FINISHING</span>
                      <span className="text-sm font-bold text-[#4da6ff] font-mono">{generatedTrialResult.finishingScore}/100</span>
                    </div>
                  </div>
                </div>

                {/* Benchmark Rows vs Average */}
                {(() => {
                  const positionKey = (activeTrialPlayer?.position || "ST").toUpperCase();
                  const benchmark = POSITION_BENCHMARKS[positionKey] || POSITION_BENCHMARKS["ST"];
                  const paceRank = calculateRanking(generatedTrialResult.paceScore, benchmark.pace);
                  const visionRank = calculateRanking(generatedTrialResult.visionScore, benchmark.vision);
                  const finishingRank = calculateRanking(generatedTrialResult.finishingScore, benchmark.finishing);
                  const overallRank = getOverallRanking(generatedTrialResult, positionKey);

                  return (
                    <div className="mx-4.5 my-4 p-4 bg-[#0a1a0f] border-t-2 border-t-[#00e56b] rounded-xl space-y-3.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black tracking-[2px] text-[#00e56b] font-sans uppercase">
                          POSITION BENCHMARK ◆
                        </span>
                        <span className="text-[10px] text-[#5a8a6a] font-medium font-mono">
                          vs. all {positionKey}s on ScoutMe
                        </span>
                      </div>

                      {/* Benchmark rows */}
                      <div className="space-y-2.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#e8f5ee]">PACE</span>
                          <span className="text-[#5a8a6a] font-mono">Your score: <strong className="text-white">{generatedTrialResult.paceScore}</strong> vs avg {benchmark.pace}</span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase text-[#050e08]" style={{ backgroundColor: paceRank.color }}>
                            {paceRank.badge}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#e8f5ee]">VISION</span>
                          <span className="text-[#5a8a6a] font-mono">Your score: <strong className="text-white">{generatedTrialResult.visionScore}</strong> vs avg {benchmark.vision}</span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase text-[#050e08]" style={{ backgroundColor: visionRank.color }}>
                            {visionRank.badge}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#e8f5ee]">FINISHING</span>
                          <span className="text-[#5a8a6a] font-mono">Your score: <strong className="text-white">{generatedTrialResult.finishingScore}</strong> vs avg {benchmark.finishing}</span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase text-[#050e08]" style={{ backgroundColor: finishingRank.color }}>
                            {finishingRank.badge}
                          </span>
                        </div>
                      </div>

                      {overallRank && (
                        <div className="space-y-2 mt-1">
                          <div className="w-full py-2 px-3 rounded-lg text-[11px] font-black uppercase text-[#050e08] text-center" style={{ backgroundColor: overallRank.color }}>
                            OVERALL: You are in the {overallRank.percentile} of {benchmark.label}s on ScoutMe
                          </div>
                          <p className="text-[10.5px] text-[#5a8a6a] italic leading-tight text-center">
                            "{overallRank.percentile === "top 5%" ? "Elite level. Professional clubs are actively searching for players at your level." :
                              overallRank.percentile === "top 10%" ? "Outstanding prospect. You belong in a higher league." :
                              overallRank.percentile === "top 25%" ? "Strong performer. Keep pushing — you are close to elite level." :
                              overallRank.percentile === "top 50%" ? "On the right track. Consistent training will move you up the rankings." :
                              "Every elite player started here. Your journey is just beginning."}"
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* AI Assessment Text block */}
                <div className="p-5 space-y-3">
                  <h5 className="text-[10px] font-mono text-[#5a8a6a] uppercase">NEURAL SCOUT SCRIBE ASSESSMENT</h5>
                  {pulseLoading ? (
                    <div className="bg-[#050e08] p-4 rounded-xl border border-[#1a3825]/85 relative flex items-center justify-center">
                      <Bot className="w-6 h-6 text-[#00e56b] animate-bounce mr-2" />
                      <p className="text-[10px] text-[#5a8a6a] uppercase font-mono tracking-wider animate-pulse">Compiling Scout Scribe report...</p>
                    </div>
                  ) : (
                    <div className="bg-[#050e08] p-4 rounded-xl border border-[#1a3825]/85 relative">
                      <p className="text-xs text-[#e8f5ee] leading-relaxed font-sans">
                        {generatedTrialResult.assessment}
                      </p>
                    </div>
                  )}
                </div>

                {/* Save To profile / pin action button */}
                <div className="p-4 bg-[#050e08]/60 border-b border-[#1a3825]/40 flex flex-col gap-2.5">
                  <button
                    onClick={handleSaveToProfile}
                    disabled={isSavingProfile}
                    className="w-full bg-[#00e56b] hover:bg-[#00c75c] text-[#050e08] py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer shadow-lg"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSavingProfile ? "⚡ SAVING TO MY PROFILE..." : "📌 SAVE TO PROFILE & PIN BADGE"}</span>
                  </button>
                </div>

                {/* Share action buttons */}
                <div className="p-4 bg-[#050e08]/80 grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => {
                      if (!activeTrialPlayer) return;
                      generateAndShareReportCard(activeTrialPlayer, {
                        overallScore: generatedTrialResult.score,
                        paceScore: generatedTrialResult.paceScore,
                        visionScore: generatedTrialResult.visionScore,
                        finishingScore: generatedTrialResult.finishingScore,
                        generatedReport: generatedTrialResult.assessment
                      }, setIsGeneratingCard);
                    }}
                    disabled={isGeneratingCard}
                    className="py-3 bg-transparent border-2 border-[#f5c518] hover:bg-[#f5c518]/10 text-[#f5c518] rounded-xl text-xs font-black uppercase tracking-wider text-center cursor-pointer"
                  >
                    {isGeneratingCard ? "Creating card..." : "📤 Share Report"}
                  </button>
                  <button
                    onClick={() => {
                      setTrialStep("HOME");
                      setSelectedDrill(null);
                      setGeneratedTrialResult(null);
                    }}
                    className="py-3 bg-[#0a1a0f] border border-[#1a3825] text-white rounded-xl text-xs font-bold uppercase tracking-wider text-center cursor-pointer"
                  >
                    Back to Home
                  </button>
                </div>

              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
};
