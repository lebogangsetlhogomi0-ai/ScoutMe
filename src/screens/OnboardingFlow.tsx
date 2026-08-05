import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { UserRole, UserProfile } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { Eye, EyeOff, Check, ArrowRight, Shield, Sparkles, ArrowLeft, Mail, RefreshCw, KeyRound } from "lucide-react";
import { DigitalAgreementModal } from "../components/DigitalAgreementModal";
import { auth } from "../firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { useToast } from "../components/Toast";

export const OnboardingFlow: React.FC = () => {
  const {
    signUpUser,
    signInUser,
    onboardingStep,
    setOnboardingStep,
    selectedOnboardingRole,
    setSelectedOnboardingRole,
    loading,
    error,
    resendVerificationEmail
  } = useApp();
  const { showToast } = useToast();

  // Multi-step local state
  const [isSignInMode, setIsSignInMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [province, setProvince] = useState("Gauteng");
  
  // Role-specific fields
  const [position, setPosition] = useState("CAM");
  const [age, setAge] = useState<number | "">("");
  const [currentClub, setCurrentClub] = useState("");
  const [pace, setPace] = useState(50);
  const [vision, setVision] = useState(50);
  const [finishing, setFinishing] = useState(50);
  const [orgName, setOrgName] = useState("");
  const [scoutRole, setScoutRole] = useState("Head Scout");

  // Club-specific signup fields
  const [accountType, setAccountType] = useState<"scout" | "club">("scout");
  const [clubName, setClubName] = useState("");
  const [leagueAffiliation, setLeagueAffiliation] = useState("SAB League");
  const [founded, setFounded] = useState<number>(2026);
  const [clubPrimaryColor, setClubPrimaryColor] = useState("#00e56b");
  const [clubSecondaryColor, setClubSecondaryColor] = useState("#f5c518");
  const [website, setWebsite] = useState("");
  const [clubBio, setClubBio] = useState("");
  
  // Forgot password flow
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  // OTP state
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpShake, setOtpShake] = useState(false);
  const [otpResendCountdown, setOtpResendCountdown] = useState(0);
  const [otpSending, setOtpSending] = useState(false);
  const otpRefs = Array.from({ length: 6 }, () => React.useRef<HTMLInputElement>(null));

  const handlePasswordReset = async () => {
    if (!resetEmail.trim()) return;
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail.trim());
      showToast(`Reset link sent to ${resetEmail.trim()} — check your inbox and spam folder.`, "success");
      setShowForgotPassword(false);
      setResetEmail("");
    } catch (err: any) {
      const code = err?.code || "";
      const msg =
        code === "auth/user-not-found" ? "No account found with this email." :
        code === "auth/invalid-email" ? "Please enter a valid email address." :
        "Something went wrong. Please try again.";
      showToast(msg, "error");
    } finally {
      setResetLoading(false);
    }
  };

  const sendOtp = async (targetEmail: string, targetName: string, targetRole: string) => {
    setOtpSending(true);
    try {
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, name: targetName, role: targetRole }),
      });
      if (res.ok) {
        setOtpResendCountdown(30);
        showToast(`Code sent to ${targetEmail} — check your inbox`, "success");
      } else {
        const data = await res.json().catch(() => ({}));
        console.error("[sendOtp] failed:", data);
        showToast("Failed to send verification code. Tap resend to try again.", "error");
      }
    } catch (err) {
      console.error("[sendOtp] network error:", err);
      showToast("Failed to send verification code. Check your connection.", "error");
    } finally {
      setOtpSending(false);
    }
  };

  useEffect(() => {
    if (otpResendCountdown <= 0) return;
    const t = setTimeout(() => setOtpResendCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [otpResendCountdown]);

  const handleOtpInput = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);
    if (digit && index < 5) otpRefs[index + 1].current?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtpDigits(pasted.split(""));
      otpRefs[5].current?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const code = otpDigits.join("");
    if (code.length < 6) return;
    setOtpLoading(true);
    try {
      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: code }),
      });
      if (res.ok) {
        setOnboardingStep(5);
      } else {
        const data = await res.json();
        const msg =
          data.error === "Code expired" ? "Code expired. Request a new one." :
          data.error === "Code already used" ? "This code was already used." :
          "Wrong code. Try again.";
        showToast(msg, "error");
        setOtpShake(true);
        setOtpDigits(["", "", "", "", "", ""]);
        setTimeout(() => { setOtpShake(false); otpRefs[0].current?.focus(); }, 600);
      }
    } finally {
      setOtpLoading(false);
    }
  };

  // Agreement checkbox
  const [agreementChecked, setAgreementChecked] = useState(false);
  const [agreementModalOpen, setAgreementModalOpen] = useState(false);
  const [hasSignedAgreement, setHasSignedAgreement] = useState(false);

  // No auto-advance. App will remain on the splash pitch screen until the user explicitly interacts.

  const handleRoleSelect = (role: UserRole) => {
    setSelectedOnboardingRole(role);
  };

  const handleRoleContinue = () => {
    if (selectedOnboardingRole) {
      setOnboardingStep(3);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignInMode) {
      if (!email) return;
      const roleToTry = selectedOnboardingRole || "player";
      let success = await signInUser(email, roleToTry, password);
      if (!success && (roleToTry === "scout" || roleToTry === "club")) {
        success = await signInUser(email, "club", password);
        if (!success) {
          success = await signInUser(email, "scout", password);
        }
      }
      if (success) {
        // Sign-in goes straight into the app — no OTP needed
        setOnboardingStep(6);
      }
    } else {
      if (!fullName || !email || !password) return;
      if (!agreementChecked) return;

      const isClubSelected = (selectedOnboardingRole === "scout" || selectedOnboardingRole === "club") && accountType === "club";

      const profileData: Partial<UserProfile> = {
        name: isClubSelected ? clubName || fullName : fullName,
        email: email,
        role: isClubSelected ? "club" : (selectedOnboardingRole || "player"),
        province,
        accountType: (selectedOnboardingRole === "scout" || selectedOnboardingRole === "club") ? accountType : "scout",
        ...(selectedOnboardingRole === "player" && {
          position,
          age: age === "" ? 18 : age,
          club: currentClub || "Unattached",
          pace,
          vision,
          finishing,
          communityRating: 0,
          totalRatings: 0,
          talentBadges: [],
          votes: 0,
          views: 0,
        }),
        ...( (selectedOnboardingRole === "scout" || selectedOnboardingRole === "club") && {
          ...(accountType === "scout" && {
            organisation: orgName || "Independent Scouting",
            scoutRole: scoutRole,
            accountType: "scout" as const
          }),
          ...(accountType === "club" && {
            clubName: clubName || fullName,
            leagueAffiliation,
            founded,
            clubColours: [clubPrimaryColor, clubSecondaryColor],
            website,
            clubBio: clubBio || "No club bio listed yet.",
            followersCount: 0,
            postsCount: 0,
            playersSigned: 0,
            verified: false,
            squad: [],
            accountType: "club" as const
          })
        })
      };

      const success = await signUpUser(profileData, password);
      if (success) {
        const otpRole = profileData.role || "player";
        const otpName = profileData.name || fullName;
        await sendOtp(email, otpName, otpRole);
        setOtpDigits(["", "", "", "", "", ""]);
        setOnboardingStep(4);
      }
    }
  };

  // Provinces list
  const provinces = [
    "Gauteng",
    "KwaZulu-Natal",
    "Western Cape",
    "Eastern Cape",
    "Free State",
    "Limpopo",
    "Mpumalanga",
    "North West",
    "Northern Cape",
    "Outside South Africa"
  ];

  // Positions list
  const positions = ["GK", "LB", "CB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST"];

  // Scout Roles list
  const scoutRoles = ["Head Scout", "Assistant Scout", "Club Manager", "Club Administrator", "Agent", "Other"];

  // Colors based on role
  const getRoleColor = (role: UserRole | null) => {
    switch (role) {
      case "player": return "#00e56b";
      case "scout": return "#f5c518";
      case "club": return "#4da6ff";
      case "fan": return "#4da6ff";
      default: return "#00e56b";
    }
  };

  const activeColor = getRoleColor(selectedOnboardingRole);

  return (
    <div className="min-h-screen bg-[#050e08] text-[#e8f5ee] flex flex-col justify-between p-6 relative overflow-hidden font-sans select-none">
      
      {/* Back button: Top-left arrow during onboarding */}
      {onboardingStep > 1 && onboardingStep < 4 && (
        <button
          id="onboarding_back_btn"
          onClick={() => {
            if (onboardingStep === 3) {
              if (isSignInMode) {
                setOnboardingStep(1); // Sign-in mode goes back to splash
              } else {
                setOnboardingStep(2); // Sign-up goes back to choose role
              }
            } else if (onboardingStep === 2) {
              setOnboardingStep(1); // Choose role goes back to splash
            }
          }}
          className="absolute top-6 left-6 z-50 flex items-center space-x-1.5 text-xs text-[#5a8a6a] hover:text-[#00e56b] bg-[#050e08]/90 border border-[#1a3825] px-3 py-1.5 rounded-xl font-bold uppercase tracking-wider transition-all shadow-md active:scale-95 animate-in fade-in duration-200"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
      )}

      {/* Background Decorative Radar Pulsing elements for aesthetic branding */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 pointer-events-none w-full">
        <div className="relative w-80 h-80 mx-auto">
          <div className="absolute inset-0 rounded-full border border-[#00e56b]/15 animate-ping opacity-25" style={{ animationDuration: '3s' }} />
          <div className="absolute inset-10 rounded-full border border-[#00e56b]/10 animate-ping opacity-20" style={{ animationDuration: '4s' }} />
          <div className="absolute inset-20 rounded-full border border-[#00e56b]/5 animate-ping opacity-15" style={{ animationDuration: '5s' }} />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* STEP 1: SPLASH SCREEN */}
        {onboardingStep === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center text-center space-y-12"
          >
            <div className="relative py-12">
              {/* Expanding Rings behind logo */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 rounded-full border border-[#00e56b]/15 animate-ping opacity-30 absolute" style={{ animationDuration: '4.5s' }} />
                <div className="w-36 h-36 rounded-full border border-[#00e56b]/10 animate-ping opacity-25 absolute" style={{ animationDuration: '6s' }} />
                <div className="w-24 h-24 rounded-full border border-[#00e56b]/5 animate-ping opacity-20 absolute" style={{ animationDuration: '8s' }} />
              </div>

              {/* Main Animated ScoutMe Logo & Staggered continuous radar rings */}
              <div className="relative flex items-center justify-center">
                {/* 3 expanding rings in #00e56b at 6% opacity, continuous slow loop */}
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 1, opacity: 0.25 }}
                    animate={{ scale: 2.3, opacity: 0 }}
                    transition={{
                      repeat: Infinity,
                      duration: 4.5,
                      delay: i * 1.5,
                      ease: "easeOut"
                    }}
                    className="absolute w-44 h-44 rounded-full border border-[#00e56b] pointer-events-none"
                    style={{ borderColor: '#00e56b', opacity: 0.06 }}
                  />
                ))}

                <motion.div 
                  initial={{ scale: 0.95, opacity: 0.9 }}
                  animate={{ scale: 1.05, opacity: 1 }}
                  transition={{ duration: 2.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                  className="z-10 relative flex flex-col items-center justify-center space-y-4"
                >
                  <img
                    src="/scoutme_logo.png"
                    alt="ScoutMe Brand Logo"
                    className="h-32 md:h-36 w-auto object-contain filter drop-shadow-[0_0_25px_rgba(0,229,107,0.15)]"
                    referrerPolicy="no-referrer"
                  />
                  <h1 className="text-5xl md:text-6xl font-extrabold font-bebas tracking-wider uppercase flex items-center justify-center">
                    <span className="text-white">SCOUT</span>
                    <span className="text-[#00e56b] ml-1">ME</span>
                  </h1>
                </motion.div>
              </div>
            </div>

            <div className="space-y-4 max-w-sm z-10">
              <h2 className="text-xl md:text-2xl font-bold text-[#e8f5ee]/95 px-4 leading-normal font-sans tracking-tight">
                "TALENT IS EVERYWHERE. OPPORTUNITY ISN'T."
              </h2>
              <p className="text-xs text-[#5a8a6a] leading-relaxed px-6">
                The first AI-powered football scouting platform built for South African grassroots players.
              </p>
            </div>

            <div className="w-full max-w-xs space-y-4 z-10 pt-4 flex flex-col items-center">
              <button
                id="get_started_btn"
                onClick={() => {
                  setIsSignInMode(false);
                  setOnboardingStep(2);
                }}
                className="w-full py-4 bg-[#00e56b] text-[#050e08] font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-[#00e56b]/20 hover:brightness-110 active:scale-95 transition-all duration-300 font-sans text-sm"
              >
                GET STARTED
              </button>
              <button
                id="sign_in_splash_btn"
                onClick={() => {
                  setIsSignInMode(true);
                  setOnboardingStep(3); // Directly to form for sign-in
                }}
                className="w-full py-4 bg-transparent text-[#00e56b] border-2 border-[#00e56b] font-bold uppercase tracking-wider rounded-xl hover:bg-[#00e56b]/10 active:scale-95 transition-all duration-300 font-sans text-sm"
              >
                SIGN IN
              </button>

              <div className="text-[10px] text-[#5a8a6a] font-semibold font-mono tracking-wider pt-4 select-none">
                Free for every player. Always. 🇿🇦⚽
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 2: ROLE SELECTION */}
        {onboardingStep === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col justify-between py-4"
          >
            <div>
              <div className="text-center mb-6">
                <h2 className="text-5xl font-extrabold font-bebas tracking-wider text-white">
                  WHO ARE YOU?
                </h2>
                <p className="text-sm text-[#5a8a6a] mt-1.5 px-8 font-medium">
                  Choose your role. Your experiences are fully built around you.
                </p>
              </div>

              {/* Stacked Option Cards */}
              <div className="space-y-4 mt-8 pb-10">
                
                {/* 1. Player Card */}
                <button
                  id="role_player"
                  onClick={() => handleRoleSelect("player")}
                  className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-300 flex items-start space-x-4 relative ${
                    selectedOnboardingRole === "player"
                      ? "bg-[#0f2318] border-[#00e56b] shadow-xl shadow-[#00e56b]/10"
                      : "bg-[#0a1a0f] border-[#1a3825] hover:border-[#1a3825]/80"
                  }`}
                >
                  <div className="text-4xl bg-[#050e08]/60 p-2.5 rounded-xl">⚽</div>
                  <div className="flex-1 pr-6">
                    <h3 className="text-lg font-bold text-white uppercase font-sans tracking-wide">Player</h3>
                    <p className="text-xs text-[#5a8a6a] leading-relaxed mt-1">
                      Upload your high-definition video highlights, build your professional scout cards, and get discovered by top clubs — 100% free.
                    </p>
                  </div>
                  {selectedOnboardingRole === "player" && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#00e56b] flex items-center justify-center">
                      <Check className="w-4 h-4 text-[#050e08] stroke-[3]" />
                    </div>
                  )}
                </button>

                {/* 2. Scout / Club Card */}
                <button
                  id="role_scout"
                  onClick={() => handleRoleSelect("scout")}
                  className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-300 flex items-start space-x-4 relative ${
                    selectedOnboardingRole === "scout" || selectedOnboardingRole === "club"
                      ? "bg-[#231e0f] border-[#f5c518] shadow-xl shadow-[#f5c518]/10"
                      : "bg-[#0a1a0f] border-[#1a3825] hover:border-[#1a3825]/80"
                  }`}
                >
                  <div className="text-4xl bg-[#050e08]/60 p-2.5 rounded-xl">🔭</div>
                  <div className="flex-1 pr-6">
                    <h3 className="text-lg font-bold text-white uppercase font-sans tracking-wide">Scout / Club</h3>
                    <p className="text-xs text-[#5a8a6a] leading-relaxed mt-1">
                      Query talent search grids, run elite AI Neural Scout analytics, manage shortlisted players, and securely negotiate.
                    </p>
                  </div>
                  {(selectedOnboardingRole === "scout" || selectedOnboardingRole === "club") && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#f5c518] flex items-center justify-center">
                      <Check className="w-4 h-4 text-[#050e08] stroke-[3]" />
                    </div>
                  )}
                </button>

                {/* 3. Fan / Supporter Card */}
                <button
                  id="role_fan"
                  onClick={() => handleRoleSelect("fan")}
                  className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-300 flex items-start space-x-4 relative ${
                    selectedOnboardingRole === "fan"
                      ? "bg-[#0f1d23] border-[#4da6ff] shadow-xl shadow-[#4da6ff]/10"
                      : "bg-[#0a1a0f] border-[#1a3825] hover:border-[#1a3825]/80"
                  }`}
                >
                  <div className="text-4xl bg-[#050e08]/60 p-2.5 rounded-xl">📣</div>
                  <div className="flex-1 pr-6">
                    <h3 className="text-lg font-bold text-white uppercase font-sans tracking-wide">Fan / Supporter</h3>
                    <p className="text-xs text-[#5a8a6a] leading-relaxed mt-1">
                      Support raw community talents, cast daily democratic votes on highlights, and watch South African grassroots football shine.
                    </p>
                  </div>
                  {selectedOnboardingRole === "fan" && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#4da6ff] flex items-center justify-center">
                      <Check className="w-4 h-4 text-[#050e08] stroke-[3]" />
                    </div>
                  )}
                </button>

              </div>
            </div>

            <div className="pt-4">
              <button
                id="role_continue_btn"
                disabled={!selectedOnboardingRole}
                onClick={handleRoleContinue}
                className="w-full py-4 rounded-xl flex items-center justify-center space-x-2 font-bold uppercase tracking-wider text-sm transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: selectedOnboardingRole ? activeColor : "#1a3020",
                  color: selectedOnboardingRole ? "#050e08" : "#5a8a6a",
                }}
              >
                <span>CONTINUE</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
              
              {/* Backward fallback back button */}
              <button 
                onClick={() => setOnboardingStep(1)}
                className="w-full text-center text-xs text-[#5a8a6a] mt-4 hover:underline"
              >
                Back to Pitch Screen
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 3: ACCOUNT CREATION FORM / SIGN IN PAGE */}
        {onboardingStep === 3 && !showForgotPassword && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 overflow-y-auto pr-1 no-scrollbar flex flex-col justify-between py-2"
          >
            <div>
              <div className="text-center mb-5">
                {selectedOnboardingRole && (
                  <span className="text-xs uppercase px-2 py-0.5 rounded-full font-mono bg-[#0f2318] border border-[#1a3825] text-[#5a8a6a] mr-2">
                    Role: {selectedOnboardingRole}
                  </span>
                )}
                <h3 className="text-5xl font-extrabold font-bebas tracking-wide mt-2">
                  {isSignInMode ? "WELCOME BACK" : "CREATE ACCOUNT"}
                </h3>
                <p className="text-xs text-[#5a8a6a] mt-1">
                  {isSignInMode ? "Sign in to access your digital locker" : "Join our nationwide scouting ecosystem for free"}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                
                {/* Role Selection dropdown inside Sign In if chosen on splash */}
                {isSignInMode && (
                  <div>
                    <label className="block text-xs font-bold text-[#5a8a6a] uppercase tracking-wide mb-1.5">
                      Select Your Registered Role
                    </label>
                    <select
                      id="signin_role"
                      value={selectedOnboardingRole || "player"}
                      onChange={(e) => setSelectedOnboardingRole(e.target.value as UserRole)}
                      className="w-full bg-[#0a1a0f] border border-[#1a3825] text-white px-3.5 py-3 rounded-xl text-sm font-semibold focus:border-[#00e56b] focus:ring-1 focus:ring-[#00e56b]/20 outline-none"
                    >
                      <option value="player">⚽ Player</option>
                      <option value="scout">💎 Scout</option>
                      <option value="club">🏟️ Club Executive</option>
                      <option value="fan">📣 Fan / Supporter</option>
                    </select>
                  </div>
                )}

                {/* Full name (only in Sign Up) */}
                {!isSignInMode && (
                  <div>
                    <label className="block text-xs font-bold text-[#5a8a6a] uppercase tracking-wide mb-1.5">
                      Full Name
                    </label>
                    <input
                      id="signup_name"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Sipho Dlamini"
                      className="w-full bg-[#0a1a0f] border border-[#1a3825] text-white px-4 py-3 rounded-xl placeholder-[#5a8a6a]/60 text-sm focus:border-[#00e56b] focus:ring-1 focus:ring-[#00e56b]/20"
                    />
                  </div>
                )}

                {/* Email (Always required) */}
                <div>
                  <label className="block text-xs font-bold text-[#5a8a6a] uppercase tracking-wide mb-1.5">
                    Email Address
                  </label>
                  <input
                    id="signup_email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@scoutme.org"
                    className="w-full bg-[#0a1a0f] border border-[#1a3825] text-white px-4 py-3 rounded-xl placeholder-[#5a8a6a]/60 text-sm focus:ring-1 focus:ring-[#00e56b]/20"
                  />
                </div>

                {/* Password (Required for registration, mockable for simple test flow) */}
                <div>
                  <label className="block text-xs font-bold text-[#5a8a6a] uppercase tracking-wide mb-1.5">
                    Security Password
                  </label>
                  <div className="relative">
                    <input
                      id="signup_password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#0a1a0f] border border-[#1a3825] text-white px-4 py-3 pr-11 rounded-xl text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#5a8a6a] hover:text-[#00e56b]"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Forgot password link — sign in mode only */}
                {isSignInMode && (
                  <div className="flex justify-end -mt-1">
                    <button
                      type="button"
                      onClick={() => { setResetEmail(email); setShowForgotPassword(true); }}
                      className="text-[12px] text-white/70 hover:text-[#00e56b] transition font-semibold underline underline-offset-2"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {/* Province dropdown */}
                {!isSignInMode && (
                  <div>
                    <label className="block text-xs font-bold text-[#5a8a6a] uppercase tracking-wide mb-1.5">
                      Province / Location
                    </label>
                    <select
                      id="signup_province"
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      className="w-full bg-[#0a1a0f] border border-[#1a3825] text-white px-3.5 py-3 rounded-xl text-sm"
                    >
                      {provinces.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* PLAYER ONLY FIELDS */}
                {selectedOnboardingRole === "player" && !isSignInMode && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="space-y-4 border-t border-[#1a3825]/50 pt-3"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-[#5a8a6a] uppercase tracking-wide mb-1.5">
                          Preferred Position
                        </label>
                        <select
                          id="signup_position"
                          value={position}
                          onChange={(e) => setPosition(e.target.value)}
                          className="w-full bg-[#0a1a0f] border border-[#1a3825] text-white px-3 py-3 rounded-xl text-sm"
                        >
                          {positions.map(pos => (
                            <option key={pos} value={pos}>{pos}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#5a8a6a] uppercase tracking-wide mb-1.5">
                          Age (Years)
                        </label>
                        <input
                          id="signup_age"
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={age}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9]/g, "");
                            setAge(raw === "" ? "" : parseInt(raw));
                          }}
                          placeholder="18"
                          className="w-full bg-[#0a1a0f] border border-[#1a3825] text-white px-4 py-3 rounded-xl text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#5a8a6a] uppercase tracking-wide mb-1.5">
                        Current Club or Local League
                      </label>
                      <input
                        id="signup_club"
                        type="text"
                        value={currentClub}
                        onChange={(e) => setCurrentClub(e.target.value)}
                        placeholder="e.g. Soweto Owls or Unattached"
                        className="w-full bg-[#0a1a0f] border border-[#1a3825] text-white px-4 py-3 rounded-xl text-sm"
                      />
                    </div>

                    {/* Self-assessment sliders */}
                    <div className="space-y-3 bg-[#050e08] border border-[#1a3825] rounded-xl p-4">
                      <p className="text-[10px] font-bold text-[#5a8a6a] uppercase tracking-wider">
                        Rate Your Own Attributes <span className="text-[#1a3825]">· scouts see these as your baseline</span>
                      </p>
                      {([
                        { label: "Pace", value: pace, set: setPace, color: "#00e56b" },
                        { label: "Vision", value: vision, set: setVision, color: "#f5c518" },
                        { label: "Finishing", value: finishing, set: setFinishing, color: "#4da6ff" },
                      ] as const).map(({ label, value, set, color }) => (
                        <div key={label} className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-[11px] font-bold text-white">{label}</span>
                            <span className="text-[11px] font-mono font-bold" style={{ color }}>{value}</span>
                          </div>
                          <input
                            type="range"
                            min={1}
                            max={99}
                            value={value}
                            onChange={e => set(parseInt(e.target.value))}
                            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                            style={{ accentColor: color }}
                          />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* SCOUT / CLUB ONLY FIELDS */}
                {(selectedOnboardingRole === "scout" || selectedOnboardingRole === "club") && !isSignInMode && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="space-y-4 border-t border-[#1a3825]/50 pt-3 text-left"
                  >
                    {/* Account Type Selection */}
                    <div>
                      <label className="block text-xs font-bold text-[#f5c518] uppercase tracking-wide mb-2 text-left">
                        Account Type *
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className={`flex items-start p-3 rounded-xl border cursor-pointer transition-all duration-200 select-none ${
                          accountType === "scout" 
                            ? "bg-[#231e0f]/50 border-[#f5c518] text-white" 
                            : "bg-[#0a1a0f] border-[#1a3825] text-[#5a8a6a]"
                        }`}>
                          <input
                            type="radio"
                            name="accountType"
                            checked={accountType === "scout"}
                            onChange={() => setAccountType("scout")}
                            className="mt-0.5 mr-2 accent-[#f5c518]"
                          />
                          <div>
                            <span className="text-xs font-bold block text-white">Individual Scout</span>
                            <span className="text-[10px] leading-snug block mt-0.5 text-[#5a8a6a]">I am an independent scout/agent</span>
                          </div>
                        </label>

                        <label className={`flex items-start p-3 rounded-xl border cursor-pointer transition-all duration-200 select-none ${
                          accountType === "club" 
                            ? "bg-[#231e0f]/50 border-[#f5c518] text-white" 
                            : "bg-[#0a1a0f] border-[#1a3825] text-[#5a8a6a]"
                        }`}>
                          <input
                            type="radio"
                            name="accountType"
                            checked={accountType === "club"}
                            onChange={() => setAccountType("club")}
                            className="mt-0.5 mr-2 accent-[#f5c518]"
                          />
                          <div>
                            <span className="text-xs font-bold block text-white">Club Executive</span>
                            <span className="text-[10px] leading-snug block mt-0.5 text-[#5a8a6a]">I represent a squad or football club</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    {accountType === "scout" ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-[#5a8a6a] uppercase tracking-wide mb-1.5 text-left">
                            Organisation Title
                          </label>
                          <input
                            id="signup_organisation"
                            type="text"
                            required
                            value={orgName}
                            onChange={(e) => setOrgName(e.target.value)}
                            placeholder="e.g. Independent, Soweto Academy, etc."
                            className="w-full bg-[#0a1a0f] border border-[#1a3825] text-white px-4 py-3 rounded-xl text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#5a8a6a] uppercase tracking-wide mb-1.5 text-left">
                            Your Scouting Designation
                          </label>
                          <select
                            id="signup_scout_role"
                            value={scoutRole}
                            onChange={(e) => setScoutRole(e.target.value)}
                            className="w-full bg-[#0a1a0f] border border-[#1a3825] text-white px-3 py-3 rounded-xl text-sm"
                          >
                            {scoutRoles.map(sr => (
                              <option key={sr} value={sr}>{sr}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 pt-1">
                        <div>
                          <label className="block text-xs font-bold text-[#5a8a6a] uppercase tracking-wide mb-1.5 text-left">
                            Club Name *
                          </label>
                          <input
                            id="signup_club_name"
                            type="text"
                            required
                            value={clubName}
                            onChange={(e) => setClubName(e.target.value)}
                            placeholder="e.g. Diepkloof United FC"
                            className="w-full bg-[#0a1a0f] border border-[#1a3825] text-white px-4 py-3 rounded-xl text-sm"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-[#5a8a6a] uppercase tracking-wide mb-1.5 text-left">
                              League Affiliation *
                            </label>
                            <select
                              id="signup_league"
                              value={leagueAffiliation}
                              onChange={(e) => setLeagueAffiliation(e.target.value)}
                              className="w-full bg-[#0a1a0f] border border-[#1a3825] text-white px-3 py-3 rounded-xl text-sm font-semibold"
                            >
                              <option value="PSL">PSL</option>
                              <option value="National First Division">NFD (National First Div)</option>
                              <option value="ABC Motsepe League">ABC Motsepe League</option>
                              <option value="SAB League">SAB League</option>
                              <option value="Local LFA">Local LFA</option>
                              <option value="School/Academy">School/Academy</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-[#5a8a6a] uppercase tracking-wide mb-1.5 text-left">
                              Year Founded
                            </label>
                            <input
                              id="signup_founded"
                              type="number"
                              value={founded}
                              onChange={(e) => setFounded(parseInt(e.target.value) || 2026)}
                              min="1850"
                              max="2026"
                              className="w-full bg-[#0a1a0f] border border-[#1a3825] text-white px-4 py-3 rounded-xl text-sm font-semibold"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-[#5a8a6a] uppercase tracking-wide mb-1.5 text-left">
                              Primary Color
                            </label>
                            <div className="flex items-center space-x-2 bg-[#050e08] border border-[#1a3825] rounded-xl px-3 py-1.5">
                              <input
                                type="color"
                                value={clubPrimaryColor}
                                onChange={(e) => setClubPrimaryColor(e.target.value)}
                                className="w-8 h-8 border-0 outline-none rounded bg-transparent cursor-pointer"
                              />
                              <span className="text-xs uppercase text-white font-mono font-semibold">{clubPrimaryColor}</span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-[#5a8a6a] uppercase tracking-wide mb-1.5 text-left">
                              Secondary Color
                            </label>
                            <div className="flex items-center space-x-2 bg-[#050e08] border border-[#1a3825] rounded-xl px-3 py-1.5">
                              <input
                                type="color"
                                value={clubSecondaryColor}
                                onChange={(e) => setClubSecondaryColor(e.target.value)}
                                className="w-8 h-8 border-0 outline-none rounded bg-transparent cursor-pointer"
                              />
                              <span className="text-xs uppercase text-white font-mono font-semibold">{clubSecondaryColor}</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#5a8a6a] uppercase tracking-wide mb-1.5 text-left">
                            Official Website URL
                          </label>
                          <input
                            id="signup_website"
                            type="url"
                            value={website}
                            onChange={(e) => setWebsite(e.target.value)}
                            placeholder="https://www.yourclub.co.za"
                            className="w-full bg-[#0a1a0f] border border-[#1a3825] text-white px-4 py-3 rounded-xl text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#5a8a6a] uppercase tracking-wide mb-1.5 text-left">
                            Club Description / Bio
                          </label>
                          <textarea
                            id="signup_club_bio"
                            value={clubBio}
                            onChange={(e) => setClubBio(e.target.value)}
                            placeholder="State your development goals, squad training ethos, or scouting criteria..."
                            rows={2}
                            className="w-full bg-[#0a1a0f] border border-[#1a3825] text-white px-4 py-3 rounded-xl text-sm resize-none"
                          />
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Digital Agreement Checkbox (required for sign up) */}
                {!isSignInMode && (
                  <div className="flex items-start space-x-2.5 p-3.5 bg-[#0f2318]/40 border border-[#1a3825] rounded-xl text-xs text-[#5a8a6a] leading-relaxed select-none">
                    <input
                      id="signup_agreement"
                      type="checkbox"
                      checked={agreementChecked}
                      onChange={(e) => setAgreementChecked(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-[#00e56b] cursor-pointer"
                    />
                    <label htmlFor="signup_agreement" className="cursor-pointer">
                      I agree to the <span onClick={(e) => { e.preventDefault(); setAgreementModalOpen(true); }} className="text-[#00e56b] font-semibold underline hover:text-[#00ff77] transition-all">ScoutMe Digital Agreement</span>. All club negotiations originating from player discovery on this platform must be declared within 24 months of first contact.
                    </label>
                  </div>
                )}

                <button
                  id="signup_submit_btn"
                  type="submit"
                  disabled={loading || (!isSignInMode && !agreementChecked)}
                  className="w-full py-4 text-sm font-bold uppercase tracking-wider rounded-xl shadow-lg transition-all duration-300 disabled:opacity-35 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: activeColor,
                    color: "#050e08",
                  }}
                >
                  {loading ? "PROCESSING PROFILES..." : isSignInMode ? "SIGN IN" : "JOIN SCOUTME ✦"}
                </button>

                {error && (
                  <div className="bg-red-950/80 border border-red-500 rounded-xl p-3.5 mt-4 text-xs text-red-200 text-left leading-relaxed flex items-start space-x-2 animate-in fade-in duration-200">
                    <span className="text-sm mt-0.5">⚠️</span>
                    <div>
                      <p className="font-bold text-red-400 uppercase tracking-wider text-[10px] mb-0.5">Authentication / Firebase Error</p>
                      <p className="font-mono text-[10.5px] break-words">{error}</p>
                    </div>
                  </div>
                )}
              </form>
            </div>

            <div className="pt-6 border-t border-[#1a3825]/55 mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsSignInMode(!isSignInMode)}
                className="text-xs text-[#5a8a6a] hover:text-[#00e56b] tracking-wide"
              >
                {isSignInMode ? "Don't have an profile? Create one now" : "Already registered? Click here to Sign In"}
              </button>
              <p className="text-[10px] text-[#5a8a6a]/70 mt-3.5 leading-normal">
                Free forever for players · No credit card required<br />
                Secured offline syncing · Ozow and PayFast support integrations
              </p>
            </div>
          </motion.div>
        )}

        {/* FORGOT PASSWORD SCREEN */}
        {showForgotPassword && (
          <motion.div
            key="forgot"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full space-y-7"
          >
            <div className="space-y-1">
              <h2 className="text-4xl font-extrabold tracking-wider font-bebas text-white uppercase">
                Reset Your Password
              </h2>
              <p className="text-xs text-[#5a8a6a] font-sans">
                Enter your email and we'll send you a reset link.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#5a8a6a] uppercase tracking-wide mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePasswordReset()}
                  placeholder="your@email.com"
                  autoFocus
                  className="w-full bg-[#0a1a0f] border border-[#1a3825] focus:border-[#00e56b]/60 text-white px-4 py-3 rounded-xl text-sm outline-none transition"
                />
              </div>

              <button
                onClick={handlePasswordReset}
                disabled={resetLoading || !resetEmail.trim()}
                className="w-full py-4 bg-[#00e56b] hover:bg-[#00c75c] disabled:opacity-50 text-[#050e08] font-extrabold text-sm uppercase tracking-widest rounded-xl transition"
              >
                {resetLoading ? "Sending..." : "Send Reset Link →"}
              </button>

              <p className="text-center text-[11px] text-[#5a8a6a] leading-relaxed">
                Didn't get it? Check your <span className="text-white/80 font-semibold">spam / junk folder</span>.<br />
                Make sure the email matches your ScoutMe account.
              </p>

              <button
                type="button"
                onClick={() => { setShowForgotPassword(false); setResetEmail(""); }}
                className="w-full text-center text-xs text-[#5a8a6a] hover:text-[#e8f5ee] transition font-medium py-1"
              >
                ← Back to Sign In
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 4: OTP VERIFICATION */}
        {!showForgotPassword && onboardingStep === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center text-center space-y-7 px-4"
          >
            <div className="w-20 h-20 rounded-full bg-[#0a1a0f] border-2 border-[#00e56b]/60 flex items-center justify-center shadow-xl relative">
              <KeyRound className="w-9 h-9 text-[#00e56b]" />
              <div className="absolute inset-0 rounded-full border border-[#00e56b]/20 animate-ping" />
            </div>

            <div className="space-y-2 max-w-xs">
              <h3 className="text-4xl font-black font-bebas tracking-wide text-white">
                CHECK YOUR EMAIL 🔑
              </h3>
              <p className="text-sm text-[#e8f5ee] font-semibold">
                We sent a 6-digit code to<br />
                <span className="text-[#00e56b] font-bold break-all">{email}</span>
              </p>
              <p className="text-xs text-[#5a8a6a]">Expires in 10 minutes</p>
            </div>

            {/* Six digit boxes */}
            <motion.div
              className="flex gap-3 justify-center"
              animate={otpShake ? { x: [0, -10, 10, -10, 10, 0] } : {}}
              transition={{ duration: 0.4 }}
              onPaste={handleOtpPaste}
            >
              {otpDigits.map((d, i) => (
                <input
                  key={i}
                  ref={otpRefs[i]}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={e => handleOtpInput(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  className="w-12 h-14 text-center text-2xl font-black bg-[#0a1a0f] border-2 border-[#1a3825] focus:border-[#00e56b] text-white rounded-xl outline-none transition-colors"
                />
              ))}
            </motion.div>

            <div className="w-full max-w-xs space-y-3">
              <button
                onClick={handleVerifyOtp}
                disabled={otpLoading || otpDigits.join("").length < 6}
                className="w-full py-4 bg-[#00e56b] hover:bg-[#00c75c] disabled:opacity-40 text-[#050e08] font-extrabold text-sm uppercase tracking-widest rounded-xl transition"
              >
                {otpLoading ? "Verifying..." : "VERIFY CODE →"}
              </button>

              <button
                onClick={async () => {
                  const role = selectedOnboardingRole || "player";
                  await sendOtp(email, fullName || email.split("@")[0], role);
                  showToast("New code sent — check your inbox.", "success");
                  setOtpDigits(["", "", "", "", "", ""]);
                  otpRefs[0].current?.focus();
                }}
                disabled={otpResendCountdown > 0 || otpSending}
                className="w-full py-3 text-xs font-bold uppercase tracking-wider rounded-xl border border-[#1a3825] text-[#5a8a6a] hover:text-white hover:border-[#5a8a6a] disabled:opacity-40 flex items-center justify-center space-x-2 transition"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{otpResendCountdown > 0 ? `Resend in ${otpResendCountdown}s` : otpSending ? "Sending..." : "Resend code"}</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 5: WELCOME SCREEN */}
        {onboardingStep === 5 && (
          <motion.div
            key="step5"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center text-center space-y-8"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#00994a] to-[#00e56b] flex items-center justify-center shadow-xl shadow-[#00e56b]/20 relative">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 10 }}
              >
                <Check className="w-10 h-10 text-[#050e08] stroke-[3]" />
              </motion.div>
              <div className="absolute inset-0 rounded-full border border-[#00e56b]/30 animate-ping" />
            </div>

            <div className="space-y-3 px-4">
              <h3 className="text-5xl font-black font-bebas tracking-wide text-white">
                YOUR PITCH IS READY
              </h3>
              <div className="max-w-xs mx-auto">
                {selectedOnboardingRole === "player" ? (
                  <p className="text-sm text-[#5a8a6a] leading-relaxed">
                    "Your pitch is ready. Upload your first highlight clip and let scouts nationwide find you."
                  </p>
                ) : selectedOnboardingRole === "scout" || selectedOnboardingRole === "club" ? (
                  <p className="text-sm text-[#5a8a6a] leading-relaxed font-sans">
                    "The grassroots talent is waiting. Your AI-assisted Neural Scout tools are active."
                  </p>
                ) : (
                  <p className="text-sm text-[#5a8a6a] leading-relaxed">
                    "Follow the players. Vote on the skills. Let eKasi grassroots football shine."
                  </p>
                )}
              </div>
            </div>

            <div className="w-full max-w-xs pt-8">
              <button
                id="lets_go_btn"
                onClick={() => setOnboardingStep(6)}
                className="w-full py-4 text-sm font-extrabold uppercase tracking-widest rounded-xl hover:brightness-110 active:scale-95 transition-all duration-300 font-sans shadow-lg"
                style={{ backgroundColor: activeColor, color: "#050e08" }}
              >
                LET'S GO
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Digital Agreement Modal */}
      <DigitalAgreementModal
        isOpen={agreementModalOpen}
        onClose={() => setAgreementModalOpen(false)}
        onSignedSuccess={() => {
          setAgreementChecked(true);
          setHasSignedAgreement(true);
        }}
      />
    </div>
  );
};
