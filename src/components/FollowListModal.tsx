import React from "react";
import { X } from "lucide-react";
import { UserProfile } from "../types";

interface FollowListModalProps {
  title: string;
  userIds: string[];
  allUsers: UserProfile[];
  onClose: () => void;
  onViewProfile?: (userId: string) => void;
}

export const FollowListModal: React.FC<FollowListModalProps> = ({
  title, userIds, allUsers, onClose, onViewProfile
}) => {
  const users = userIds
    .map(id => allUsers.find(u => u.userId === id))
    .filter(Boolean) as UserProfile[];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-md bg-[#050e08] border border-[#1a3825] rounded-t-3xl max-h-[70vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#1a3825]">
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#e8f5ee]">{title}</h3>
          <button onClick={onClose} className="text-[#5a8a6a] hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-1">
          {users.length === 0 ? (
            <p className="text-center text-[#5a8a6a] text-sm py-8">No one here yet</p>
          ) : (
            users.map(user => (
              <button
                key={user.userId}
                onClick={() => onViewProfile?.(user.userId)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#0a1a0f] transition text-left"
              >
                <div className="w-10 h-10 rounded-full bg-[#0a1a0f] border border-[#1a3825] flex items-center justify-center text-lg flex-shrink-0 overflow-hidden">
                  {user.avatarBase64
                    ? <img src={user.avatarBase64} className="w-full h-full object-cover" />
                    : <span>{user.name?.[0] || "?"}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#e8f5ee] truncate">{user.name}</p>
                  <p className="text-[11px] text-[#5a8a6a] capitalize">{user.role}{user.position ? ` · ${user.position}` : ""}</p>
                </div>
                {onViewProfile && (
                  <span className="text-[#00e56b] text-xs font-bold">View →</span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
