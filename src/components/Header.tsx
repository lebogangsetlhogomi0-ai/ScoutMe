import React, { useState, useRef, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { useToast } from "./Toast";
import { Bell, Trophy, ShieldAlert, Award, User, BarChart2, Settings, LogOut, ChevronRight, Mail } from "lucide-react";
import { auth } from "../firebase";
import { reload } from "firebase/auth";

interface HeaderProps {
  onNotificationClick?: () => void;
  onProfileClick?: () => void;
  onClubIntelClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onProfileClick, onClubIntelClick }) => {
  const { currentUser, signOutUser, resendVerificationEmail } = useApp();
  const { showToast } = useToast();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const isScoutOrClub = currentUser?.role === "scout" || currentUser?.role === "club";

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getRoleColor = (role?: string) => {
    switch (role) {
      case "player": return "text-[#00e56b] border-[#1a3825] bg-[#0f2318]/50";
      case "scout":  return "text-[#f5c518] border-[#38331a] bg-[#231e0f]/50";
      case "club":   return "text-[#4da6ff] border-[#1a2e38] bg-[#0f1d23]/50";
      default:       return "text-[#e8f5ee] border-[#1a3825] bg-transparent";
    }
  };

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case "player": return <Trophy className="w-3.5 h-3.5 mr-1" />;
      case "scout":  return <Award className="w-3.5 h-3.5 mr-1" />;
      case "club":   return <ShieldAlert className="w-3.5 h-3.5 mr-1" />;
      default:       return null;
    }
  };

  const dummyNotifications = [
    { id: 1, text: "Your highlight got 120 new votes from eKasi supporters soccer fans!", time: "5m ago" },
    { id: 2, text: "Verified Scout Coach Lebo viewed your profile details.", time: "2h ago" },
    { id: 3, text: "Welcome to ScoutMe! Prepare your first match footage.", time: "1d ago" }
  ];

  const [emailVerified, setEmailVerified] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    if (!currentUser || !auth?.currentUser) { setEmailVerified(null); return; }
    reload(auth.currentUser)
      .then(() => setEmailVerified(auth?.currentUser?.emailVerified ?? null))
      .catch(() => setEmailVerified(null));
  }, [currentUser]);

  return (
    <div className="sticky top-0 z-40">
    <header className="flex items-center justify-between px-4 py-3 bg-[#050e08]/90 backdrop-blur-md border-b border-[#1a3825]">
      {/* Brand logo */}
      <div className="flex items-center space-x-2 border-l border-transparent">
        <img
          src="/scoutme_logo.png"
          alt="ScoutMe Logo"
          className="h-9 w-auto object-contain filter drop-shadow"
          referrerPolicy="no-referrer"
        />
      </div>

      <div className="flex items-center space-x-3.5">
        {currentUser && (
          <div className={`flex items-center px-2.5 py-1 text-xs font-semibold uppercase tracking-wider border rounded-full font-sans ${getRoleColor(currentUser.role)}`}>
            {getRoleIcon(currentUser.role)}
            {currentUser.role}
          </div>
        )}

        {/* Profile menu — scout and club only */}
        {currentUser && (currentUser.role === "scout" || currentUser.role === "club") && (
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="p-1.5 rounded-full text-[#5a8a6a] hover:text-[#00e56b] hover:bg-[#0a1a0f]/85 transition-all duration-300 focus:outline-none"
              title="Profile menu"
            >
              <User className="w-5 h-5" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-[#0a1a0f] border border-[#1a3825] rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-[#1a3825]/60 animate-in fade-in slide-in-from-top-3 duration-200">
                {/* User info header */}
                <div className="px-4 py-3 bg-[#0f2318]">
                  <p className="text-xs font-bold text-[#e8f5ee] truncate">{currentUser.name || "My Account"}</p>
                  <p className="text-[10px] text-[#5a8a6a] uppercase tracking-wider mt-0.5">{currentUser.role}</p>
                </div>

                {/* View Profile */}
                <button
                  onClick={() => { setShowProfileMenu(false); onProfileClick?.(); }}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#0f2318]/60 transition-colors duration-150 group"
                >
                  <div className="flex items-center space-x-2.5">
                    <User className="w-4 h-4 text-[#5a8a6a] group-hover:text-[#e8f5ee]" />
                    <span className="text-xs text-[#e8f5ee]/90 font-sans">View profile</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#5a8a6a]/60" />
                </button>

                {/* Club Intel — scout & club only */}
                {isScoutOrClub && (
                  <button
                    onClick={() => { setShowProfileMenu(false); onClubIntelClick?.(); }}
                    className="w-full flex items-center justify-between px-4 py-3 bg-[#00e56b]/5 hover:bg-[#00e56b]/10 transition-colors duration-150 group border-l-2 border-[#00e56b]/60"
                  >
                    <div className="flex items-center space-x-2.5">
                      <BarChart2 className="w-4 h-4 text-[#00e56b]" />
                      <div className="flex flex-col items-start">
                        <span className="text-xs text-[#00e56b] font-semibold font-sans">Club Intel</span>
                        <span className="text-[9px] text-[#5a8a6a] font-mono">Strategic insights</span>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[#00e56b]/60" />
                  </button>
                )}

                {/* Settings */}
                <button
                  onClick={() => { setShowProfileMenu(false); showToast("Settings coming soon ✦", "info"); }}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#0f2318]/60 transition-colors duration-150 group"
                >
                  <div className="flex items-center space-x-2.5">
                    <Settings className="w-4 h-4 text-[#5a8a6a] group-hover:text-[#e8f5ee]" />
                    <span className="text-xs text-[#e8f5ee]/90 font-sans">Settings</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#5a8a6a]/60" />
                </button>

                {/* Sign out */}
                <button
                  onClick={() => { setShowProfileMenu(false); signOutUser(); }}
                  className="w-full flex items-center space-x-2.5 px-4 py-3 hover:bg-[#1a0f0f]/60 transition-colors duration-150 group"
                >
                  <LogOut className="w-4 h-4 text-[#ff4444]/70 group-hover:text-[#ff4444]" />
                  <span className="text-xs text-[#ff4444]/70 group-hover:text-[#ff4444] font-sans">Sign out</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Notifications */}
        <div className="relative">
          <button
            id="notification_bell"
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-1.5 rounded-full text-[#5a8a6a] hover:text-[#00e56b] hover:bg-[#0a1a0f]/85 transition-all duration-300 relative focus:outline-none"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#ff4444] rounded-full border border-[#050e08]" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 bg-[#0a1a0f] border border-[#1a3825] rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-[#1a3825] animate-in fade-in slide-in-from-top-3 duration-200">
              <div className="px-4 py-2.5 bg-[#0f2318] flex items-center justify-between">
                <span className="text-xs font-bold font-bebas tracking-wide uppercase text-[#00e56b]">Recent Notifications</span>
                <span className="text-[9px] text-[#5a8a6a] bg-[#050e08] px-1.5 py-0.5 rounded">3 NEW</span>
              </div>
              <div className="max-h-60 overflow-y-auto divide-y divide-[#1a3825]/50">
                {dummyNotifications.map(notif => (
                  <div key={notif.id} className="p-3 hover:bg-[#0f2318]/50 transition duration-150">
                    <p className="text-xs text-[#e8f5ee]/90 leading-relaxed">{notif.text}</p>
                    <span className="block mt-1 text-[9px] text-[#5a8a6a]/80 font-mono">{notif.time}</span>
                  </div>
                ))}
              </div>
              <div className="p-2 text-center bg-[#050e08]">
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-[10px] font-bold text-[#00e56b] hover:underline uppercase tracking-wider"
                >
                  Close Panel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>

    {/* Gold unverified email banner */}
    {currentUser && emailVerified === false && (
      <div className="flex items-center justify-between px-4 py-2 bg-[#1f1b0a] border-b border-[#f5c518]/30">
        <div className="flex items-center space-x-2">
          <Mail className="w-3.5 h-3.5 text-[#f5c518] flex-shrink-0" />
          <span className="text-[10.5px] text-[#e8d87a] font-sans">
            📧 Verify your email to unlock all features
          </span>
        </div>
        <button
          onClick={async () => {
            await resendVerificationEmail().catch(() => {});
            showToast("Verification email resent ✦", "success");
          }}
          className="text-[10px] font-bold text-[#f5c518] uppercase tracking-wider hover:underline ml-3 flex-shrink-0"
        >
          Resend
        </button>
      </div>
    )}
    </div>
  );
};
