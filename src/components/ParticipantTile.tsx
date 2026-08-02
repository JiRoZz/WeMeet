import React, { useEffect, useRef, useState } from 'react';
import { MicOff, Hand, Monitor, Maximize2, Pin, PinOff } from 'lucide-react';
import { User } from '../types';
import { getVideoFilterCSS } from '../utils/media';

interface ParticipantTileProps {
  participant: User;
  stream: MediaStream | null;
  isLocal: boolean;
  isActiveSpeaker?: boolean;
  isPinned?: boolean;
  onTogglePin?: (userId: string) => void;
}

export const ParticipantTile: React.FC<ParticipantTileProps> = ({
  participant,
  stream,
  isLocal,
  isActiveSpeaker,
  isPinned,
  onTogglePin,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const tileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const toggleFullscreen = () => {
    if (!tileRef.current) return;
    if (!document.fullscreenElement) {
      tileRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const filterClass = getVideoFilterCSS(participant.activeFilter || 'none');

  return (
    <div
      ref={tileRef}
      className={`relative aspect-video rounded-xl bg-gray-900 border overflow-hidden flex items-center justify-center shadow-md group transition-all duration-200 ${
        isActiveSpeaker
          ? 'border-emerald-500 ring-4 ring-emerald-500/80 shadow-lg shadow-emerald-500/20'
          : participant.isHandRaised
          ? 'border-amber-500 ring-2 ring-amber-500/20'
          : 'border-gray-800 hover:border-gray-700'
      }`}
    >
      {/* Video element or Avatar fallback */}
      {!participant.cameraOff && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`w-full h-full object-cover ${isLocal ? '-scale-x-100' : ''} ${filterClass}`}
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 relative">
          {participant.photoURL ? (
            <img
              src={participant.photoURL}
              alt={participant.name}
              referrerPolicy="no-referrer"
              className={`w-20 h-20 md:w-24 md:h-24 rounded-full object-cover shadow-lg border-2 transition-all ${
                isActiveSpeaker
                  ? 'ring-4 ring-emerald-500 border-emerald-500'
                  : 'border-gray-700'
              }`}
            />
          ) : (
            <div
              className={`w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-lg transition-transform ${
                isActiveSpeaker
                  ? 'ring-4 ring-emerald-500 border-2 border-emerald-500'
                  : 'ring-2 ring-gray-800'
              }`}
              style={{ backgroundColor: participant.avatarColor }}
            >
              {participant.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-xs text-gray-400 font-semibold">{participant.name}</span>
        </div>
      )}

      {/* Hand Raised Banner */}
      {participant.isHandRaised && (
        <div className="absolute top-3 left-3 bg-amber-500 text-white px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 shadow-md">
          <Hand className="w-3.5 h-3.5" />
          <span>Hand Raised</span>
        </div>
      )}

      {/* Screen Sharing Banner */}
      {participant.isScreenSharing && (
        <div className="absolute top-3 right-3 bg-indigo-600 text-white px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 shadow-md">
          <Monitor className="w-3.5 h-3.5" />
          <span>Presenting</span>
        </div>
      )}

      {/* Bottom Overlay: Participant Name & Status Icons */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none z-20">
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs text-white max-w-[80%] truncate shadow-sm">
          <span className="font-semibold truncate">
            {participant.name} {isLocal && '(You)'}
          </span>
          {participant.isMuted && <MicOff className="w-3.5 h-3.5 text-red-400 shrink-0" />}
        </div>

        {/* Hover Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto bg-black/60 backdrop-blur-md p-1 rounded-lg border border-white/10">
          {onTogglePin && (
            <button
              onClick={() => onTogglePin(participant.id)}
              className="p-1.5 rounded-md hover:bg-white/20 text-white transition-colors"
              title={isPinned ? 'Unpin video' : 'Pin video'}
            >
              {isPinned ? <PinOff className="w-3.5 h-3.5 text-indigo-400" /> : <Pin className="w-3.5 h-3.5" />}
            </button>
          )}

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-md hover:bg-white/20 text-white transition-colors"
            title="Toggle Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
