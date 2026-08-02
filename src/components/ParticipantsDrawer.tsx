import React, { useState } from 'react';
import { X, Search, Mic, MicOff, Video as VideoIcon, VideoOff, Hand, Shield } from 'lucide-react';
import { User } from '../types';

interface ParticipantsDrawerProps {
  participants: User[];
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
}

export const ParticipantsDrawer: React.FC<ParticipantsDrawerProps> = ({
  participants,
  currentUser,
  isOpen,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filtered = participants.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div id="participants-drawer-panel" className="absolute inset-0 md:relative md:inset-auto w-full md:w-80 bg-white border-l border-gray-200 flex flex-col h-full z-40 shrink-0 shadow-xl">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
        <div>
          <h2 className="font-bold text-gray-900 text-sm">Participants ({participants.length})</h2>
          <p className="text-xs text-gray-500">Active in this room</p>
        </div>
        <button
          onClick={onClose}
          id="close-participants-btn"
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-gray-200 bg-gray-50">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="search-participants-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search member..."
            className="w-full bg-white border border-gray-200 rounded-full pl-9 pr-3 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2">
        {filtered.map((user) => {
          const isSelf = user.id === currentUser.id;

          return (
            <div
              key={user.id}
              className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-200 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  <div className="relative shrink-0">
                    <img
                      src={user.photoURL}
                      alt={user.name}
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-full object-cover border border-gray-200"
                    />
                    {user.isHandRaised && (
                      <span className="absolute -top-1 -right-1 bg-amber-500 text-white p-0.5 rounded-full shadow-sm">
                        <Hand className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                ) : (
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-sm shrink-0 relative"
                    style={{ backgroundColor: user.avatarColor }}
                  >
                    {user.name.charAt(0).toUpperCase()}
                    {user.isHandRaised && (
                      <span className="absolute -top-1 -right-1 bg-amber-500 text-white p-0.5 rounded-full shadow-sm">
                        <Hand className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-gray-800 truncate max-w-[120px]">
                      {user.name}
                    </span>
                    {isSelf && (
                      <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded border border-indigo-200">
                        You
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 block mt-0.5">
                    Joined {new Date(user.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex items-center gap-1.5 text-gray-500">
                {user.isMuted ? (
                  <MicOff className="w-4 h-4 text-red-500" />
                ) : (
                  <Mic className="w-4 h-4 text-emerald-600" />
                )}
                {user.cameraOff ? (
                  <VideoOff className="w-4 h-4 text-gray-400" />
                ) : (
                  <VideoIcon className="w-4 h-4 text-indigo-600" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
