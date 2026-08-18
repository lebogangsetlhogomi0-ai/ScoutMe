import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { UserProfile } from "../types";

interface FollowListModalProps {
  ownerName?: string;
  followers: string[];
  following: string[];
  allUsers: UserProfile[];
  initialTab?: "followers" | "following";
  onClose: () => void;
  onViewProfile?: (userId: string) => void;
}

export const FollowListModal: React.FC<FollowListModalProps> = ({
  ownerName,
  followers,
  following,
  allUsers,
  initialTab = "followers",
  onClose,
  onViewProfile,
}) => {
  const [tab, setTab] = useState<"followers" | "following">(initialTab);

  const listIds = tab === "followers" ? followers : following;
  const users = listIds
    .map(id => allUsers.find(u => u.userId === id))
    .filter(Boolean) as UserProfile[];

  return (
    <div className="fixed inset-0 z-50 bg-[#050e08] flex flex-col">
      {/* Header */}
      <div className="flex items-center px-4 pt-safe-top pt-4 pb-3 border-b border-[#1a3825] bg-[#050e08]">
        <button
          onClick={onClose}
          className="p-2 -ml-2 text-[#5a8a6a] hover:text-white transition"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="ml-2 text-sm font-bold text-[#e8f5ee] truncate">
          {ownerName || "Connections"}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1a3825]">
        <button
          onClick={() => setTab("followers")}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${
            tab === "followers"
              ? "text-[#e8f5ee] border-b-2 border-[#00e56b]"
              : "text-[#5a8a6a]"
          }`}
        >
          {followers.length} Followers
        </button>
        <button
          onClick={() => setTab("following")}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${
            tab === "following"
              ? "text-[#e8f5ee] border-b-2 border-[#00e56b]"
              : "text-[#5a8a6a]"
          }`}
        >
          {following.length} Following
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <span className="text-4xl">
              {tab === "followers" ? "👥" : "🔍"}
            </span>
            <p className="text-sm text-[#5a8a6a] text-center">
              {tab === "followers" ? "No followers yet" : "Not following anyone yet"}
            </p>
          </div>
        ) : (
          users.map(user => (
            <button
              key={user.userId}
              onClick={() => { onViewProfile?.(user.userId); onClose(); }}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#0a1a0f] active:bg-[#0a1a0f] transition text-left"
            >
              <div className="w-11 h-11 rounded-full bg-[#0a1a0f] border border-[#1a3825] flex items-center justify-center text-lg flex-shrink-0 overflow-hidden">
                {user.avatarBase64
                  ? <img src={user.avatarBase64} alt={user.name} className="w-full h-full object-cover" />
                  : <span className="text-[#00e56b] font-bold">{user.name?.[0]?.toUpperCase() || "?"}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#e8f5ee] truncate">{user.name}</p>
                <p className="text-[11px] text-[#5a8a6a] capitalize">
                  {user.role}{user.position ? ` · ${user.position}` : ""}
                </p>
              </div>
              {onViewProfile && (
                <span className="text-[#00e56b] text-xs font-bold flex-shrink-0">View →</span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
};
