import React, { useState, useEffect } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { Header } from "./components/Header";
import { BottomNav } from "./components/BottomNav";
import { OnboardingFlow } from "./screens/OnboardingFlow";
import { DigitalPitchFeed } from "./screens/DigitalPitchFeed";
import { Discover } from "./screens/Discover";
import { PlayerProfile } from "./screens/PlayerProfile";
import { UploadFlow } from "./screens/UploadFlow";
import { NeuralScoutAI } from "./screens/NeuralScoutAI";
import { ClubStrategicIntel } from "./screens/ClubStrategicIntel";
import { NewsFeed } from "./screens/NewsFeed";
import { ProfileScreen } from "./screens/ProfileScreen";
import { PaymentsModal } from "./components/PaymentsModal";
import { ToastProvider, useToast } from "./components/Toast";

// Safe mock storage fallback to prevent iframe security/sandbox crashes
const localStorageShadow = {
  getItem: (key: string): string | null => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      const store = (window as any).__memStore || {};
      return store[key] || null;
    }
  },
  setItem: (key: string, val: string): void => {
    try {
      window.localStorage.setItem(key, val);
    } catch {
      if (!(window as any).__memStore) (window as any).__memStore = {};
      (window as any).__memStore[key] = val;
    }
  },
  removeItem: (key: string): void => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      if ((window as any).__memStore) delete (window as any).__memStore[key];
    }
  }
};

const localStorage = localStorageShadow;

const AppContent: React.FC = () => {
  const { currentUser, onboardingStep, users, upgradeUserTier, unreadNotificationsCount } = useApp();
  const { showToast } = useToast();

  // Update PWA app icon badge with unread notification count
  React.useEffect(() => {
    if ("setAppBadge" in navigator) {
      if (unreadNotificationsCount > 0) {
        (navigator as any).setAppBadge(unreadNotificationsCount).catch(() => {});
      } else {
        (navigator as any).clearAppBadge().catch(() => {});
      }
    }
  }, [unreadNotificationsCount]);
  const [activeTab, setActiveTab] = useState<string>("pitch");

  // Custom deep navigation states
  const [focusedPlayerId, setFocusedPlayerId] = useState<string | null>(null);
  const [lastFeedTab, setLastFeedTab] = useState<string>("pitch");

  // Tab history stack — tracks where the user came from so back goes to the right place
  const tabHistoryRef = React.useRef<string[]>([]);
  const focusedPlayerIdRef = React.useRef(focusedPlayerId);
  const activeTabRef = React.useRef(activeTab);
  const lastFeedTabRef = React.useRef(lastFeedTab);
  React.useEffect(() => { focusedPlayerIdRef.current = focusedPlayerId; }, [focusedPlayerId]);
  React.useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
  React.useEffect(() => { lastFeedTabRef.current = lastFeedTab; }, [lastFeedTab]);

  // Wrap setActiveTab to track history
  const navigateTab = React.useCallback((tab: string) => {
    tabHistoryRef.current = [...tabHistoryRef.current, activeTabRef.current];
    setActiveTab(tab);
  }, []);

  // Push a history entry on every navigation so back button has somewhere to go
  React.useEffect(() => {
    window.history.pushState({ scoutme: true }, "");
  }, [activeTab, focusedPlayerId]);

  // Intercept hardware/browser back button — go to previous location, not always home
  React.useEffect(() => {
    const handlePopState = () => {
      window.history.pushState({ scoutme: true }, "");
      if (focusedPlayerIdRef.current) {
        // Close player profile → return to where we opened it from
        setFocusedPlayerId(null);
        setActiveTab(lastFeedTabRef.current);
      } else {
        // Return to previous tab, or stay on pitch if nothing in history
        const history = tabHistoryRef.current;
        if (history.length > 0) {
          const prev = history[history.length - 1];
          tabHistoryRef.current = history.slice(0, -1);
          setActiveTab(prev);
        }
        // If already at root with no history, do nothing (stay in app)
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Payments Modal states
  const [paymentsModalOpen, setPaymentsModalOpen] = useState(false);
  const [paymentsModalTier, setPaymentsModalTier] = useState<"player_pro" | "scout_pro" | undefined>(undefined);

  // PayFast return URL handling
  const paymentReturnPath = window.location.pathname;
  const isPaymentSuccess = paymentReturnPath === "/payment-success";
  const isPaymentCancel = paymentReturnPath === "/payment-cancel";

  useEffect(() => {
    if (isPaymentSuccess) {
      // Activate the plan that was stored before redirect
      const pendingPlan = sessionStorage.getItem("payfast_pending_plan") as "player_pro" | "scout_pro" | null;
      if (pendingPlan && currentUser) {
        upgradeUserTier(pendingPlan).catch(console.error);
        sessionStorage.removeItem("payfast_pending_plan");
        sessionStorage.removeItem("payfast_payment_id");
      }
    }
  }, [isPaymentSuccess]);

  useEffect(() => {
    (window as any).triggerPaymentFlow = (tier?: "player_pro" | "scout_pro") => {
      setPaymentsModalTier(tier);
      setPaymentsModalOpen(true);
    };
    return () => {
      delete (window as any).triggerPaymentFlow;
    };
  }, []);

  // Waitlist confirmation simulation states
  const [activeMailAlert, setActiveMailAlert] = useState<any | null>(null);
  const [selectedMail, setSelectedMail] = useState<any | null>(null);
  const [showMailModal, setShowMailModal] = useState<boolean>(false);

  // Auto-update detection: poll for new deployments every 2 minutes
  const [updateAvailable, setUpdateAvailable] = useState(false);
  useEffect(() => {
    // Grab the hash of the currently running JS bundle from the DOM
    const currentScript = document.querySelector<HTMLScriptElement>('script[src*="/assets/index-"]');
    const currentHash = currentScript?.src?.match(/index-([^.]+)\.js/)?.[1];
    if (!currentHash) return;

    const check = async () => {
      try {
        const res = await fetch("/", { cache: "no-store" });
        const html = await res.text();
        const match = html.match(/src="\/assets\/index-([^"]+)\.js"/);
        if (match && match[1] !== currentHash) {
          setUpdateAvailable(true);
        }
      } catch {}
    };

    const id = setInterval(check, 2 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // PWA Install states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState<boolean>(() => {
    const dismissed = localStorage.getItem("scoutme_pwa_dismissed") === "true";
    if (dismissed) return false;
    const isStandalone = 
      (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || 
      (typeof navigator !== "undefined" && (navigator as any).standalone);
    return !isStandalone;
  });
  const [showiOSInstructions, setShowiOSInstructions] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissed = localStorage.getItem("scoutme_pwa_dismissed") === "true";
      if (!dismissed) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`PWA install prompt outcome: ${outcome}`);
      setDeferredPrompt(null);
      setShowInstallBanner(false);
    } else {
      const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isiOS) {
        setShowiOSInstructions(true);
      } else {
        showToast("To install: open your browser menu → Add to Home Screen", "info");
      }
    }
  };

  const handleDismissInstall = () => {
    localStorage.setItem("scoutme_pwa_dismissed", "true");
    setShowInstallBanner(false);
  };

  // Background polling for simulated emails
  useEffect(() => {
    if (!currentUser || !currentUser.email) return;

    const readShown = () => {
      try {
        return JSON.parse(localStorage.getItem("scoutme_shown_tickets") || "[]");
      } catch {
        return [];
      }
    };

    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(`/api/simulated-emails?email=${encodeURIComponent(currentUser.email)}`);
        if (!response.ok) return;
        const emails = await response.json();
        
        if (Array.isArray(emails) && emails.length > 0) {
          const shown = readShown();
          // Find first email that hasn't been shown to the user yet
          const unnotified = emails.find(e => !shown.includes(e.ticketId));
          if (unnotified) {
            const updated = [...shown, unnotified.ticketId];
            localStorage.setItem("scoutme_shown_tickets", JSON.stringify(updated));
            
            // Trigger visual alert
            setActiveMailAlert(unnotified);
            
            // Synth chime using Web Audio API (zero-latency, safe)
            try {
              const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
              if (AudioContextClass) {
                const audioCtx = new AudioContextClass();
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.type = "sine";
                osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 chime frequency
                osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
                gain.gain.setValueAtTime(0.01, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.3);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.3);
              }
            } catch (soundErr) {
              console.log("Audio chime skipped:", soundErr);
            }

            // Auto hide floating banner after 8 seconds
            setTimeout(() => {
              setActiveMailAlert(null);
            }, 8000);
          }
        }
      } catch (err) {
        console.warn("Polling simulated waitlist emails failed:", err);
      }
    }, 4000);

    return () => clearInterval(intervalId);
  }, [currentUser]);

  // Custom callback to view player profile from grid or feeds
  const handleOpenProfile = (playerId: string) => {
    setLastFeedTab(activeTab);
    setFocusedPlayerId(playerId);
  };

  // Trigger Scout AI — only for scout/club roles
  const handleTriggerScoutAI = (playerId: string) => {
    if (currentUser?.role !== "scout" && currentUser?.role !== "club") return;
    navigateTab("scout-ai");
    setFocusedPlayerId(null);
  };

  const handleBackToFeed = () => {
    setFocusedPlayerId(null);
    setActiveTab(lastFeedTab);
  };

  // Direct state fallback if onboarding not completed
  if (!currentUser || onboardingStep < 6) {
    return <OnboardingFlow />;
  }

  // PayFast return pages
  if (isPaymentSuccess) {
    return (
      <div className="min-h-screen bg-[#050e08] flex items-center justify-center p-6">
        <div className="bg-[#0a1a0f] border border-[#1a3825] rounded-2xl p-8 max-w-sm w-full text-center space-y-5">
          <div className="w-16 h-16 bg-[#00e56b]/20 border border-[#00e56b] rounded-full flex items-center justify-center mx-auto">
            <span className="text-3xl">✦</span>
          </div>
          <div className="space-y-2">
            <span className="text-[10px] font-black tracking-widest text-[#f5c518] font-mono block">TRANSACTION COMPLETE 🎉</span>
            <h2 className="text-2xl font-black font-bebas text-white tracking-wider uppercase">Payment Successful!</h2>
            <p className="text-xs text-[#5a8a6a] leading-relaxed">
              Your subscription is now active. Welcome to ScoutMe Pro — your premium features are unlocked.
            </p>
          </div>
          <button
            onClick={() => window.location.href = "/"}
            className="w-full py-3.5 bg-[#00e56b] text-[#050e08] rounded-xl font-bold text-xs uppercase tracking-wider"
          >
            Start Using Pro Features ⚡
          </button>
        </div>
      </div>
    );
  }

  if (isPaymentCancel) {
    return (
      <div className="min-h-screen bg-[#050e08] flex items-center justify-center p-6">
        <div className="bg-[#0a1a0f] border border-[#1a3825] rounded-2xl p-8 max-w-sm w-full text-center space-y-5">
          <div className="w-16 h-16 bg-[#1a0a0a] border border-[#ff4444]/40 rounded-full flex items-center justify-center mx-auto text-3xl">🔒</div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black font-bebas text-white tracking-wider uppercase">Payment Cancelled</h2>
            <p className="text-xs text-[#5a8a6a] leading-relaxed">No charge was made. Return to plans whenever you're ready.</p>
          </div>
          <button
            onClick={() => window.location.href = "/"}
            className="w-full py-3.5 bg-[#0a1a0f] border border-[#1a3825] text-[#5a8a6a] rounded-xl font-bold text-xs uppercase tracking-wider"
          >
            Return to App
          </button>
        </div>
      </div>
    );
  }

  // Active Screen Selector Grid logic
  const renderActiveScreen = () => {
    // If a profile is focused, override view dynamically
    if (focusedPlayerId) {
      const targetUser = users.find(u => u.userId === focusedPlayerId);
      if (targetUser && (targetUser.role === "club" || targetUser.accountType === "club")) {
        return (
          <ProfileScreen 
            clubId={focusedPlayerId} 
            onBack={handleBackToFeed}
          />
        );
      }
      return (
        <PlayerProfile
          playerId={focusedPlayerId}
          onBack={handleBackToFeed}
          onTriggerScoutAI={handleTriggerScoutAI}
          onOpenClubProfile={(clubId) => setFocusedPlayerId(clubId)}
          onOpenPlayerProfile={(uid) => setFocusedPlayerId(uid)}
        />
      );
    }

    switch (activeTab) {
      case "pitch":
        return (
          <DigitalPitchFeed
            onSuggestUpload={() => navigateTab("upload")}
            onOpenPlayerProfile={handleOpenProfile}
            onTriggerScoutAI={handleTriggerScoutAI}
          />
        );
      case "discover":
        return <Discover onOpenPlayerProfile={handleOpenProfile} />;
      case "scout-ai":
        if (currentUser?.role !== "scout" && currentUser?.role !== "club") return <DigitalPitchFeed onSuggestUpload={() => navigateTab("upload")} onOpenPlayerProfile={handleOpenProfile} onTriggerScoutAI={handleTriggerScoutAI} />;
        return <NeuralScoutAI initialPlayerId="" onOpenPlayerProfile={handleOpenProfile} />;
      case "club-intel":
        return <ClubStrategicIntel onOpenPlayerProfile={handleOpenProfile} />;
      case "upload":
        return <UploadFlow onUploadSuccess={() => navigateTab("pitch")} />;
      case "news":
        return <NewsFeed />;
      case "profile":
        return <ProfileScreen onOpenProfile={handleOpenProfile} />;
      default:
        return (
          <DigitalPitchFeed
            onSuggestUpload={() => setActiveTab("upload")}
            onOpenPlayerProfile={handleOpenProfile}
            onTriggerScoutAI={handleTriggerScoutAI}
          />
        );
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#050e08] text-[#e8f5ee] relative select-none">
      
      {/* Navigation Top Header */}
      <Header onProfileClick={() => navigateTab("profile")} onClubIntelClick={() => navigateTab("club-intel")} onNavigate={(tab) => navigateTab(tab)} onOpenProfile={(userId) => { setFocusedPlayerId(null); setLastFeedTab(activeTab); setFocusedPlayerId(userId); }} />

      {/* Primary Scroll View Body Container */}
      <main className="flex-1 flex flex-col pt-3 w-full max-w-xl mx-auto overflow-hidden">
        {renderActiveScreen()}
      </main>

      {/* Navigation Bottom Tab Bar Bar */}
      <BottomNav activeTab={activeTab} setActiveTab={(tab) => {
        setFocusedPlayerId(null);
        navigateTab(tab);
      }} />

      {/* New version available banner */}
      {updateAvailable && (
        <div className="fixed top-0 left-0 right-0 z-[300] bg-[#00e56b] text-[#050e08] px-4 py-3 flex items-center justify-between shadow-lg">
          <span className="text-xs font-bold">⚡ New update available</span>
          <button
            onClick={() => window.location.reload()}
            className="text-xs font-black uppercase tracking-wider bg-[#050e08] text-[#00e56b] px-3 py-1 rounded-full"
          >
            Refresh now
          </button>
        </div>
      )}

      {/* PWA "Add to Home Screen" Install Banner */}
      {showInstallBanner && (
        <div className="fixed bottom-20 left-4 right-4 z-40 max-w-md mx-auto bg-[#0a1a0f] border border-[#00e56b]/40 rounded-2xl shadow-2xl p-4 flex items-center justify-between space-x-3.5 animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#00e56b]/10 border border-[#00e56b]/30 flex items-center justify-center text-lg shrink-0">
              📲
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-sans">
                Install ScoutMe App
              </h4>
              <p className="text-[10.5px] text-[#5a8a6a] leading-tight mt-0.5">
                Add to your home screen for full offline-ready speed and trials!
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3.5 py-2 bg-[#00e56b] text-[#050e08] rounded-xl text-[10.5px] font-black uppercase tracking-wider hover:brightness-105 cursor-pointer"
            >
              Install
            </button>
            <button
              onClick={handleDismissInstall}
              className="p-2 text-[#5a8a6a] hover:text-white text-xs font-bold uppercase cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* iOS Safari Custom PWA Instructions Modal */}
      {showiOSInstructions && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-55 flex items-center justify-center p-4">
          <div className="bg-[#0a1a0f] border border-[#1a3825] w-full max-w-sm rounded-2xl p-6 space-y-4">
            <div className="text-center space-y-2">
              <span className="text-4xl">📲</span>
              <h3 className="text-md font-bold text-white uppercase tracking-wider">
                Install on iPhone / iPad
              </h3>
              <p className="text-xs text-[#5a8a6a] leading-relaxed">
                Safari on iOS does not support one-tap installation. Follow these simple steps to install ScoutMe like a native app:
              </p>
            </div>

            <div className="bg-[#050e08] border border-[#1a3825] rounded-xl p-4.5 space-y-3.5 font-sans text-xs text-[#dfede5]">
              <div className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-[#1a3825] text-[#00e56b] font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <p className="leading-tight pt-0.5">
                  Tap the <strong className="text-white font-semibold">Share</strong> button in Safari's bottom toolbar (the square icon with an arrow pointing up).
                </p>
              </div>
              <div className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-[#1a3825] text-[#00e56b] font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <p className="leading-tight pt-0.5">
                  Scroll down the share sheet options list and select <strong className="text-white font-semibold">Add to Home Screen</strong>.
                </p>
              </div>
              <div className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-[#1a3825] text-[#00e56b] font-bold flex items-center justify-center shrink-0">
                  3
                </span>
                <p className="leading-tight pt-0.5">
                  Tap <strong className="text-white font-semibold">Add</strong> in the top-right corner to complete the setup.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowiOSInstructions(false)}
              className="w-full py-3 bg-[#00e56b] text-[#050e08] rounded-xl text-xs font-black uppercase tracking-wider hover:brightness-105 cursor-pointer"
            >
              ✓ Understood
            </button>
          </div>
        </div>
      )}

      {/* Sliding PWA Phone Notification Banner */}
      {activeMailAlert && (
        <div 
          onClick={() => {
            setSelectedMail(activeMailAlert);
            setShowMailModal(true);
            setActiveMailAlert(null);
          }}
          className="fixed top-4 left-4 right-4 z-50 max-w-sm mx-auto bg-[#141517] border-2 border-[#16a34a] rounded-2xl shadow-2xl p-4 flex items-start space-x-3 cursor-pointer select-none ring-2 ring-[#16a34a]/30 transition hover:scale-[1.02] active:scale-95 animate-slideDown"
        >
          <div className="bg-[#16a34a]/20 p-2.5 rounded-xl border border-[#16a34a]/40 text-[#16a34a] shrink-0">
            {/* Elegant glowing active email logo badge */}
            <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="font-sans font-bold text-[10px] uppercase tracking-wider text-[#16a34a]">INCOMING MAIL DETECTED</p>
              <span className="text-[9px] text-gray-500 font-mono">JUST NOW</span>
            </div>
            <p className="font-sans font-semibold text-sm text-gray-200 mt-1 truncate">
              Waitlist Ticket {activeMailAlert.ticketId}
            </p>
            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
              Ticket delivered! Tap to read your ticket and review your spot.
            </p>
          </div>
        </div>
      )}

      {/* Simulated Email Client Inbox View Over */}
      {showMailModal && selectedMail && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-55 flex items-center justify-center p-4">
          <div className="bg-[#0f0e0d] border border-stone-800 rounded-3xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl max-h-[90vh] animate-slideDown">
            {/* Mail header bar styling representing custom iOS device mail */}
            <div className="bg-stone-900 px-5 py-4 border-b border-stone-800 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500 flex items-center justify-center cursor-pointer" onClick={() => { setShowMailModal(false); setSelectedMail(null); }}></div>
                <span className="font-mono text-[11px] text-stone-400">ScoutMe Waitlist Inbox</span>
              </div>
              <button 
                onClick={() => { setShowMailModal(false); setSelectedMail(null); }}
                className="text-stone-300 hover:text-white transition text-xs font-bold px-2.5 py-1 rounded-lg bg-stone-800 active:bg-stone-700 font-mono"
              >
                CLOSE
              </button>
            </div>

            {/* Email Body Panel (Simulating HTML format) */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="border border-stone-800 rounded-2xl p-4 bg-stone-950/60 font-sans space-y-2.5">
                <div className="flex items-start justify-between text-xs border-b border-stone-900 pb-2.5 mb-2">
                  <div className="space-y-0.5">
                    <p className="text-stone-400"><strong>From:</strong> waitlist@scoutme.org <span className="text-[9px] bg-green-950 text-green-400 px-1.5 py-0.5 rounded ml-1 font-mono">✦ VERIFIED</span></p>
                    <p className="text-stone-300"><strong>To:</strong> {selectedMail.email}</p>
                  </div>
                  <span className="text-[10px] text-stone-500 font-mono">Today</span>
                </div>

                <div className="bg-[#0c0a09] text-[#f5f5f4] p-5 rounded-xl border border-[#292524]">
                  <div className="text-center mb-5 flex flex-col items-center justify-center">
                    <img
                      src="/scoutme_logo.png"
                      alt="ScoutMe Logo"
                      className="h-10 w-auto object-contain mb-1"
                      referrerPolicy="no-referrer"
                    />
                    <p className="text-stone-400 text-[9px] uppercase tracking-wider mt-1">African Grassroots Football Discovery Platform</p>
                  </div>

                  <div className="bg-[#1c1917] rounded-lg p-4 border border-[#44403c] space-y-3">
                    <p className="text-stone-200 text-xs">Hi <strong className="text-white">{selectedMail.name}</strong>,</p>
                    <p className="text-stone-300 text-xs leading-relaxed">
                      Welcome to the ScoutMe family! You have successfully joined the waitlist for the premier grassroots soccer discovery platform in Africa.
                    </p>

                    <div className="border-t border-b border-[#292524] py-3 my-3 flex justify-around">
                      <div className="text-center">
                        <span className="block text-[8px] uppercase tracking-wider text-[#a8a29e]">Your Queue Spot</span>
                        <strong className="text-green-400 text-lg">#{selectedMail.queueNo}</strong>
                      </div>
                      <div className="text-center border-l border-[#292524] pl-5">
                        <span className="block text-[8px] uppercase tracking-wider text-[#a8a29e]">Waitlist Ticket</span>
                        <strong className="text-stone-200 text-sm font-mono">{selectedMail.ticketId}</strong>
                      </div>
                    </div>

                    <div className="bg-[#0c0a09] rounded p-2.5 border-l-2 border-green-500">
                      <p className="text-stone-200 text-[10px] leading-relaxed">
                        <strong className="text-green-400">Waitlist Details:</strong><br/>
                        • Account Category: <span className="capitalize font-semibold text-green-400">{selectedMail.role}</span><br/>
                        • Email: {selectedMail.email}<br/>
                        • Status: Active Waiting List
                      </p>
                    </div>

                    <p className="text-[10px] leading-relaxed text-[#a8a29e]">
                      We are admitting creators, players, and scouts in waves as physical regional leagues initialize. Keep posting your clips!
                    </p>
                  </div>

                  <div className="text-center text-stone-500 text-[9px] mt-4">
                    <p>© 2026 ScoutMe Technologies. South Africa.</p>
                  </div>
                </div>
              </div>

              {/* Action Bar inside simulated email */}
              <div className="flex flex-col space-y-2 shrink-0">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(selectedMail.ticketId).catch(() => {});
                    showToast(`Ticket ${selectedMail.ticketId} copied ✦`, "success");
                  }}
                  className="w-full bg-[#16a34a] hover:bg-[#15803d] text-white py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition active:scale-95 flex items-center justify-center space-x-2 shadow-lg shadow-green-950/20 cursor-pointer"
                >
                  <span>COPY TICKET CODE</span>
                </button>
                <p className="text-[9.5px] text-stone-500 font-sans text-center leading-relaxed">
                  💡 <strong>Testing Mode:</strong> This simulates a real Waitlist Ticket Email dispatched in the background to <strong>{selectedMail.email}</strong>. Connect your SMTP servers to receive physical emails directly!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payments Overlay Modal */}
      <PaymentsModal 
        isOpen={paymentsModalOpen} 
        onClose={() => setPaymentsModalOpen(false)} 
        defaultTier={paymentsModalTier}
      />

    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AppProvider>
  );
}
