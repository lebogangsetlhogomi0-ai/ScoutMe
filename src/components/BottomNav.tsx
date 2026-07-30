import React from "react";
import { useApp } from "../context/AppContext";
import { Play, Search, PlusCircle, Radio, Cpu, User } from "lucide-react";

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const { currentUser } = useApp();

  if (!currentUser) return null;

  const role = currentUser.role;
  const isScoutOrClub = role === "scout" || role === "club";

  // 2-1-2 layout: PITCH, DISCOVER | ⊕ UPLOAD | SCOUT AI (scout/club) or NEWS, NEWS
  const leftTabs = [
    { id: "pitch", label: "PITCH", icon: Play },
    { id: "discover", label: "DISCOVER", icon: Search },
  ];

  const rightTabs = isScoutOrClub
    ? [
        { id: "scout-ai", label: "SCOUT AI", icon: Cpu },
        { id: "news", label: "NEWS", icon: Radio },
      ]
    : [
        { id: "news", label: "NEWS", icon: Radio },
        { id: "profile", label: "PROFILE", icon: User },
      ];

  const getRoleColorClass = () => {
    switch (role) {
      case "player": return "bg-[#00e56b]";
      case "scout":  return "bg-[#f5c518]";
      case "club":   return "bg-[#4da6ff]";
      default:       return "bg-[#00e56b]";
    }
  };

  const getActiveTabColor = () => {
    switch (role) {
      case "player": return "text-[#00e56b]";
      case "scout":  return "text-[#f5c518]";
      case "club":   return "text-[#4da6ff]";
      default:       return "text-[#00e56b]";
    }
  };

  const renderTab = (tab: { id: string; label: string; icon: React.ElementType }) => {
    const IconComponent = tab.icon;
    const isActive = activeTab === tab.id;
    return (
      <button
        key={tab.id}
        id={`tab_${tab.id}`}
        onClick={() => setActiveTab(tab.id)}
        className="flex-1 flex flex-col items-center justify-center h-full relative py-1 focus:outline-none"
      >
        {isActive && (
          <div className={`absolute top-0 left-1/4 right-1/4 h-[3px] rounded-full ${getRoleColorClass()}`} />
        )}
        <IconComponent className={`w-5 h-5 transition-all duration-200 ${isActive ? getActiveTabColor() : "text-[#5a8a6a] hover:text-[#e8f5ee]"}`} />
        <span className={`text-[9.5px] font-sans font-medium uppercase tracking-wide mt-1 select-none ${isActive ? "text-[#e8f5ee]" : "text-[#5a8a6a]"}`}>
          {tab.label}
        </span>
      </button>
    );
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a1a0f] border-t border-[#1a3825] px-2 py-1 pb-safe shadow-2xl">
      <div className="flex items-center justify-around max-w-xl mx-auto h-16 relative">
        {/* Left: PITCH, DISCOVER */}
        {leftTabs.map(renderTab)}

        {/* Center: UPLOAD FAB */}
        <button
          id="tab_upload"
          onClick={() => setActiveTab("upload")}
          className="flex flex-col items-center justify-center -mt-6 relative z-10 group"
        >
          <div className="w-14 h-14 rounded-full bg-[#00e56b] flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300 border-4 border-[#050e08]">
            <PlusCircle className="w-8 h-8 text-[#050e08]" />
          </div>
          <span className="text-[9px] uppercase tracking-wider text-[#5a8a6a] font-sans mt-1">
            UPLOAD
          </span>
        </button>

        {/* Right: SCOUT AI + NEWS (scout/club) or just NEWS (player/fan) */}
        {rightTabs.map(renderTab)}
      </div>
    </nav>
  );
};
