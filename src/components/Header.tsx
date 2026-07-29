import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { useToast } from "./Toast";
import { Bell, Trophy, ShieldAlert, Award } from "lucide-react";

interface HeaderProps {
  onNotificationClick?: () => void;
}

export const Header: React.FC<HeaderProps> = () => {
  const { currentUser, isDemoMode } = useApp();
  const { showToast } = useToast();
  const [showNotifications, setShowNotifications] = useState(false);

  const getRoleColor = (role?: string) => {
    switch (role) {
      case "player":
        return "text-[#00e56b] border-[#1a3825] bg-[#0f2318]/50";
      case "scout":
        return "text-[#f5c518] border-[#38331a] bg-[#231e0f]/50";
      case "club":
        return "text-[#4da6ff] border-[#1a2e38] bg-[#0f1d23]/50";
      default:
        return "text-[#e8f5ee] border-[#1a3825] bg-transparent";
    }
  };

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case "player":
        return <Trophy className="w-3.5 h-3.5 mr-1" />;
      case "scout":
        return <Award className="w-3.5 h-3.5 mr-1" />;
      case "club":
        return <ShieldAlert className="w-3.5 h-3.5 mr-1" />;
      default:
        return null;
    }
  };

  const dummyNotifications = [
    { id: 1, text: "Your highlight got 120 new votes from eKasi supporters soccer fans!", time: "5m ago" },
    { id: 2, text: "Verified Scout Coach Lebo viewed your profile details.", time: "2h ago" },
    { id: 3, text: "Welcome to ScoutMe! Prepare your first match footage.", time: "1d ago" }
  ];

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-[#050e08]/90 backdrop-blur-md border-b border-[#1a3825]">
      {/* Brand logo image */}
      <div className="flex items-center space-x-2 border-l border-transparent">
        <img
          src="/scoutme_logo.png"
          alt="ScoutMe Logo"
          className="h-9 w-auto object-contain filter drop-shadow"
          referrerPolicy="no-referrer"
        />
        <span className="text-[10px] bg-[#1a3020] text-[#5a8a6a] px-1.5 py-0.5 rounded font-mono font-medium tracking-tight">KASI SILICON</span>
        {isDemoMode && (
          <div 
            onClick={() => showToast("Running in Demo Mode — any email/password works ✦", "info")}
            className="text-[10px] bg-[#f5c518] text-black font-extrabold px-2 py-0.5 rounded-full font-sans cursor-pointer uppercase tracking-wider shadow-sm select-none hover:scale-105 active:scale-95 transition-all whitespace-nowrap animate-pulse"
            title="Firebase not connected. Running with demo data."
          >
            DEMO MODE
          </div>
        )}
      </div>

      <div className="flex items-center space-x-3.5">
        {currentUser && (
          <div className={`flex items-center px-2.5 py-1 text-xs font-semibold uppercase tracking-wider border rounded-full font-sans ${getRoleColor(currentUser.role)}`}>
            {getRoleIcon(currentUser.role)}
            {currentUser.role}
          </div>
        )}

        {/* Notifications Icon with popover */}
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
  );
};
