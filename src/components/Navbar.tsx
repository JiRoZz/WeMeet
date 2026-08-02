import React, { useState } from 'react';
import { Copy, Check, Users, ShieldCheck, Volume2, VolumeX, LogOut, Video, User as UserIcon } from 'lucide-react';
import { User } from '../types';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  roomId: string;
  currentUser: User;
  participantCount: number;
  isConnected: boolean;
  isMutedSound: boolean;
  onToggleSound: () => void;
  onOpenParticipants: () => void;
  onLeaveCall: () => void;
  onOpenAuth?: () => void;
  onOpenAccount?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  roomId,
  currentUser,
  participantCount,
  isConnected,
  isMutedSound,
  onToggleSound,
  onOpenParticipants,
  onLeaveCall,
  onOpenAuth,
  onOpenAccount,
}) => {
  const [copied, setCopied] = useState(false);
  const { currentUser: firebaseUser, logout } = useAuth();

  const copyRoomLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header id="app-navbar" className="h-14 md:h-16 bg-white border-b border-gray-200 text-gray-900 px-3 md:px-6 flex items-center justify-between z-30 shrink-0 shadow-sm">
      {/* Brand & Room Info */}
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        <img
          src="/logo.png"
          alt="WeMeet logo"
          className="w-8 h-8 md:w-10 md:h-10 rounded-lg object-cover shadow-sm shrink-0"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 md:gap-2">
            <h1 className="font-bold text-gray-900 text-xs md:text-base leading-none truncate hidden sm:inline">
              WeMeet
            </h1>
            <span className="text-[10px] md:text-xs text-gray-500 font-mono bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 truncate max-w-[80px] sm:max-w-none">
              {roomId}
            </span>
            <button
              onClick={copyRoomLink}
              id="copy-room-link-btn"
              className="inline-flex items-center gap-1 text-[11px] md:text-xs px-2 md:px-3 py-1 rounded-lg bg-white hover:bg-gray-50 text-gray-700 transition-colors border border-gray-200 shadow-sm font-medium shrink-0"
              title="Copy room link"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600 font-semibold hidden sm:inline">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-gray-500" />
                  <span className="hidden sm:inline">Copy Link</span>
                </>
              )}
            </button>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[10px] md:text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {isConnected ? 'Live' : 'Connecting...'}
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> Encrypted P2P
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
        <button
          onClick={onOpenAccount}
          id="navbar-account-profile-btn"
          className="flex items-center gap-1.5 md:gap-2 bg-gray-50 hover:bg-gray-100 px-2.5 md:px-3 py-1 md:py-1.5 rounded-lg border border-gray-200 text-left transition-all shadow-sm"
          title="Edit Profile & Account Settings"
        >
          {currentUser.photoURL ? (
            <img
              src={currentUser.photoURL}
              alt={currentUser.name}
              referrerPolicy="no-referrer"
              className="w-6 h-6 md:w-7 md:h-7 rounded-full object-cover border border-indigo-400 shrink-0"
            />
          ) : (
            <div
              className="w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold text-white shrink-0 shadow-sm"
              style={{ backgroundColor: currentUser.avatarColor }}
            >
              {(currentUser.name || 'U').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex flex-col text-left hidden sm:flex max-w-[120px] truncate">
            <span className="text-xs font-bold text-gray-800 leading-none truncate">
              {currentUser.name}
            </span>
            <span className="text-[10px] text-indigo-600 font-medium leading-tight truncate">
              {currentUser.username ? `@${currentUser.username}` : 'Edit Account'}
            </span>
          </div>
        </button>

        <button
          onClick={onToggleSound}
          id="toggle-sound-btn"
          className="p-1.5 md:p-2 rounded-lg bg-white hover:bg-gray-50 text-gray-600 transition-colors border border-gray-200 shadow-sm"
          title={isMutedSound ? 'Unmute UI sounds' : 'Mute UI sounds'}
        >
          {isMutedSound ? <VolumeX className="w-4 h-4 text-gray-400" /> : <Volume2 className="w-4 h-4 text-gray-700" />}
        </button>

        <button
          onClick={onOpenParticipants}
          id="open-participants-btn"
          className="hidden sm:flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold transition-colors border border-gray-200"
        >
          <Users className="w-3.5 h-3.5 md:w-4 md:h-4 text-indigo-600" />
          <span className="text-xs">{participantCount}</span>
        </button>

        <button
          onClick={onLeaveCall}
          id="navbar-leave-call-btn"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-colors shadow-sm"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Leave</span>
        </button>
      </div>
    </header>
  );
};

