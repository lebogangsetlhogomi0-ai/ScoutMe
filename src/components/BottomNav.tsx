import React from "react";
import { useApp } from "../context/AppContext";
import { Play, Search, PlusCircle, Radio, User, Cpu, BarChart2 } from "lucide-react";

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const { currentUser } = useApp();

  if (!currentUser) return null;

  const role = currentUser.role;

  // Player and Fan tabs:
  // Tab 1: Digital Pitch (Play triangle icon)
  // Tab 2: Discover (Search diamond / search icon)
  // Tab 3: Upload (PlusCircle green)
  // Tab 4: News (Radio / news icon)
  // Tab 5: Profile (User / circle icon)
  // Scout / Club additional: Scout AI (Cpu/Diamond) & Club Strategic Intel (BarChart2) optionally. Let's merge standard with custom!
  // "Bottom navigation bar — fixed to bottom of screen — 5 tabs for Player and Fan, 6 tabs for Scout or Club:
  // Scout or Club additional tab between Discover and News: Scout AI — icon is a filled diamond ◆"
  const isScoutOrClub = role === "scout" || role === "club";

  const tabs = [
    { id: "pitch", label: "PITCH", icon: Play },
    { id: "discover", label: "DISCOVER", icon: Search },
    ...(isScoutOrClub ? [{ id: "scout-ai", label: "SCOUT AI", icon: Cpu }] : []),
    ...(role === "club" ? [{ id: "club-intel", label: "CLUB INTEL", icon: BarChart2 }] : []),
    { id: "upload", label: "UPLOAD", icon: PlusCircle, isCenter: true },
    { id: "news", label: "NEWS", icon: Radio },
    // Profile tab hidden for club — moved to header next to notification bell
    ...(role !== "club" ? [{ id: "profile", label: "PROFILE", icon: User }] : []),
  ];

  const getRoleColorClass = () => {
    switch (role) {
      case "player":
        return "bg-[#00e56b]";
      case "scout":
        return "bg-[#f5c518]";
      case "club":
        return "bg-[#4da6ff]";
      default:
        return "bg-[#00e56b]";
    }
  };

  const getActiveTabColor = () => {
    switch (role) {
      case "player":
        return "text-[#00e56b]";
      case "scout":
        return "text-[#f5c518]";
      case "club":
        return "text-[#4da6ff]";
      default:
        return "text-[#00e56b]";
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a1a0f] border-t border-[#1a3825] px-2 py-1 pb-safe shadow-2xl">
      <div className="flex items-center justify-around max-w-xl mx-auto h-16 relative">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          const isActive = activeTab === tab.id;

          if (tab.isCenter) {
            return (
              <button
                key={tab.id}
                id="tab_upload"
                onClick={() => setActiveTab(tab.id)}
                className="flex flex-col items-center justify-center -mt-6 relative z-10 group"
              >
                <div className={`w-14 h-14 rounded-full bg-[#00e56b] flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300 border-4 border-[#050e08]`}>
                  <PlusCircle className="w-8 h-8 text-[#050e08]" />
                </div>
                <span className="text-[9px] uppercase tracking-wider text-[#5a8a6a] font-sans mt-1">
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              id={`tab_${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex flex-col items-center justify-center h-full relative py-1 focus:outline-none"
            >
              {/* Active Tab Indicator Bar above */}
              {isActive && (
                <div className={`absolute top-0 left-1/4 right-1/4 h-[3px] rounded-full ${getRoleColorClass()}`} />
              )}
              
              <IconComponent className={`w-5 h-5 transition-all duration-200 ${isActive ? getActiveTabColor() : "text-[#5a8a6a] hover:text-[#e8f5ee]"}`} />
              
              <span className={`text-[9.5px] font-sans font-medium uppercase tracking-wide mt-1 select-none ${isActive ? "text-[#e8f5ee]" : "text-[#5a8a6a]"}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
