import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Monitor,
  Hand,
  Smile,
  MessageSquare,
  Users,
  Settings,
  PhoneOff,
} from 'lucide-react';

interface CallControlsProps {
  isMicMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  unreadCount: number;
  participantCount: number;
  isChatOpen: boolean;
  isParticipantsOpen: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onToggleHandRaise: () => void;
  onSendReaction: (emoji: string) => void;
  onToggleChat: () => void;
  onToggleParticipants: () => void;
  onOpenSettings: () => void;
  onLeaveCall: () => void;
}

const EMOJI_LIST = ['🎉', '👍', '❤️', '👏', '🔥', '😂', '😮', '🚀'];

export const CallControls: React.FC<CallControlsProps> = ({
  isMicMuted,
  isCameraOff,
  isScreenSharing,
  isHandRaised,
  unreadCount,
  participantCount,
  isChatOpen,
  isParticipantsOpen,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onToggleHandRaise,
  onSendReaction,
  onToggleChat,
  onToggleParticipants,
  onOpenSettings,
  onLeaveCall,
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  return (
    <div id="call-controls-bar" className="h-16 md:h-20 bg-white border-t border-gray-200 px-3 md:px-6 flex items-center justify-center sm:justify-between z-30 shrink-0 relative shadow-sm">
      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <div className="absolute bottom-18 md:bottom-22 left-1/2 -translate-x-1/2 bg-white border border-gray-200 p-2 md:p-2.5 rounded-2xl shadow-xl flex items-center gap-1 md:gap-2 z-40 animate-in fade-in slide-in-from-bottom-2 duration-150 max-w-[95vw] overflow-x-auto">
          {EMOJI_LIST.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onSendReaction(emoji);
                setShowEmojiPicker(false);
              }}
              className="text-xl md:text-2xl hover:scale-125 transition-transform p-1.5 md:p-2 rounded-xl hover:bg-gray-100 shrink-0"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Left: Settings (Hidden on mobile) */}
      <div className="hidden sm:flex items-center gap-1.5 md:gap-2">
        <button
          onClick={onOpenSettings}
          id="controls-settings-btn"
          className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-white hover:bg-gray-50 text-gray-700 transition-colors border border-gray-200 shadow-sm flex items-center justify-center shrink-0"
          title="Audio & Video Settings"
        >
          <Settings className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
        </button>
      </div>

      {/* Center: Main Controls Group (Centered on mobile and desktop) */}
      <div className="flex items-center justify-center gap-2 sm:gap-3">
        {/* Mic Toggle */}
        <button
          onClick={onToggleMic}
          id="controls-mic-btn"
          className={`w-10 h-10 md:w-12 md:h-12 rounded-full transition-all shadow-sm flex items-center justify-center shrink-0 ${
            isMicMuted
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
          }`}
          title={isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        >
          {isMicMuted ? <MicOff className="w-4 h-4 md:w-5 md:h-5" /> : <Mic className="w-4 h-4 md:w-5 md:h-5" />}
        </button>

        {/* Camera Toggle */}
        <button
          onClick={onToggleCamera}
          id="controls-cam-btn"
          className={`w-10 h-10 md:w-12 md:h-12 rounded-full transition-all shadow-sm flex items-center justify-center shrink-0 ${
            isCameraOff
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
          }`}
          title={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
        >
          {isCameraOff ? <VideoOff className="w-4 h-4 md:w-5 md:h-5" /> : <VideoIcon className="w-4 h-4 md:w-5 md:h-5" />}
        </button>

        {/* Screen Share Toggle - Desktop only */}
        <button
          onClick={onToggleScreenShare}
          id="controls-screenshare-btn"
          className={`hidden sm:flex w-10 h-10 md:w-12 md:h-12 rounded-full transition-all shadow-sm items-center justify-center shrink-0 ${
            isScreenSharing
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-none'
              : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
          }`}
          title={isScreenSharing ? 'Stop Presenting' : 'Share Screen'}
        >
          <Monitor className="w-4 h-4 md:w-5 md:h-5" />
        </button>

        {/* Raise Hand Toggle - Desktop only */}
        <button
          onClick={onToggleHandRaise}
          id="controls-handraise-btn"
          className={`hidden sm:flex w-10 h-10 md:w-12 md:h-12 rounded-full transition-all shadow-sm items-center justify-center shrink-0 ${
            isHandRaised
              ? 'bg-amber-500 hover:bg-amber-600 text-white border-none font-bold'
              : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
          }`}
          title={isHandRaised ? 'Lower Hand' : 'Raise Hand'}
        >
          <Hand className="w-4 h-4 md:w-5 md:h-5" />
        </button>

        {/* Emoji Reactions Popover Trigger - Desktop only */}
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          id="controls-emoji-btn"
          className={`hidden sm:flex w-10 h-10 md:w-12 md:h-12 rounded-full transition-all shadow-sm items-center justify-center shrink-0 ${
            showEmojiPicker
              ? 'bg-indigo-600 text-white border-none'
              : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
          }`}
          title="Send Emoji Reaction"
        >
          <Smile className="w-4 h-4 md:w-5 md:h-5" />
        </button>

        {/* Leave Call */}
        <button
          onClick={onLeaveCall}
          id="controls-leave-call-btn"
          className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all shadow-md flex items-center justify-center shrink-0"
          title="Leave Room & Call"
        >
          <PhoneOff className="w-4 h-4 md:w-5 md:h-5" />
        </button>

        {/* Mobile Participants Button */}
        <button
          onClick={onToggleParticipants}
          id="controls-participants-mobile-btn"
          className={`flex sm:hidden w-10 h-10 rounded-full transition-all shadow-sm items-center justify-center shrink-0 border ${
            isParticipantsOpen
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
          }`}
          title="View Participants"
        >
          <Users className="w-4 h-4" />
        </button>

        {/* Mobile Chat Button */}
        <button
          onClick={onToggleChat}
          id="controls-chat-mobile-btn"
          className={`relative flex sm:hidden w-10 h-10 rounded-full transition-all shadow-sm items-center justify-center shrink-0 border ${
            isChatOpen
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
          }`}
          title="Open Text Chat"
        >
          <MessageSquare className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Right: Drawer Toggles (Desktop only) */}
      <div className="hidden sm:flex items-center gap-1.5 md:gap-2">
        <button
          onClick={onToggleParticipants}
          id="controls-participants-drawer-btn"
          className={`p-2 md:px-3 md:py-2 rounded-lg transition-colors border text-xs font-semibold flex items-center gap-1.5 shadow-sm ${
            isParticipantsOpen
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
          }`}
          title="View Participants"
        >
          <Users className="w-4 h-4" />
          <span className="hidden sm:inline">{participantCount}</span>
        </button>

        <button
          onClick={onToggleChat}
          id="controls-chat-drawer-btn"
          className={`relative p-2 md:px-3 md:py-2 rounded-lg transition-colors border text-xs font-semibold flex items-center gap-1.5 shadow-sm ${
            isChatOpen
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
          }`}
          title="Open Text Chat"
        >
          <MessageSquare className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center border-2 border-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
