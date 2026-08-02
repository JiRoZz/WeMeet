import React from 'react';
import { EmojiReaction, User } from '../types';
import { ParticipantTile } from './ParticipantTile';

interface VideoGridProps {
  currentUser: User;
  participants: User[];
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  activeSpeakerId: string | null;
  pinnedUserId: string | null;
  onTogglePin: (userId: string) => void;
  reactions: EmojiReaction[];
}

export const VideoGrid: React.FC<VideoGridProps> = ({
  currentUser,
  participants,
  localStream,
  screenStream,
  remoteStreams,
  activeSpeakerId,
  pinnedUserId,
  onTogglePin,
  reactions,
}) => {
  // Combine all participants
  const allUsers = [
    currentUser,
    ...participants.filter((p) => p.id !== currentUser.id),
  ];

  const pinnedUser = allUsers.find((u) => u.id === pinnedUserId);
  const otherUsers = allUsers.filter((u) => u.id !== pinnedUserId);

  // Determine grid column layout
  const totalCount = allUsers.length;
  let gridColsClass = 'grid-cols-1 md:grid-cols-2';
  if (totalCount === 1) gridColsClass = 'grid-cols-1 max-w-4xl mx-auto w-full h-full';
  else if (totalCount === 2) gridColsClass = 'grid-cols-1 md:grid-cols-2 max-w-5xl mx-auto w-full';
  else if (totalCount <= 4) gridColsClass = 'grid-cols-1 sm:grid-cols-2 max-w-6xl mx-auto w-full';
  else if (totalCount <= 9) gridColsClass = 'grid-cols-2 md:grid-cols-3 max-w-7xl mx-auto w-full';
  else gridColsClass = 'grid-cols-2 md:grid-cols-4 max-w-7xl mx-auto w-full';

  return (
    <div id="video-grid-container" className="relative flex-1 p-2 md:p-6 overflow-y-auto flex flex-col justify-center items-center w-full h-full">
      {/* Floating Emoji Reactions Overlay */}
      <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
        {reactions.map((r) => (
          <div
            key={r.id}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 animate-bounce flex flex-col items-center gap-1 bg-slate-900/90 text-white px-3 py-1.5 rounded-full border border-slate-700 shadow-2xl transition-all"
            style={{
              left: `${30 + Math.random() * 40}%`,
              animationDuration: '2.5s',
            }}
          >
            <span className="text-3xl">{r.emoji}</span>
            <span className="text-[10px] font-semibold text-slate-300">{r.senderName}</span>
          </div>
        ))}
      </div>

      {/* Pinned Stage View */}
      {pinnedUser ? (
        <div className="w-full h-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-2 md:gap-4">
          <div className="lg:col-span-9 flex items-center justify-center">
            <ParticipantTile
              participant={pinnedUser}
              stream={
                pinnedUser.id === currentUser.id
                  ? screenStream || localStream
                  : remoteStreams.get(pinnedUser.id) || null
              }
              isLocal={pinnedUser.id === currentUser.id}
              isActiveSpeaker={activeSpeakerId === pinnedUser.id}
              isPinned={true}
              onTogglePin={onTogglePin}
            />
          </div>
          <div className="lg:col-span-3 flex flex-row lg:flex-col gap-2 md:gap-3 overflow-x-auto lg:overflow-y-auto max-h-full">
            {otherUsers.map((user) => (
              <div key={user.id} className="w-40 lg:w-full shrink-0">
                <ParticipantTile
                  participant={user}
                  stream={
                    user.id === currentUser.id
                      ? screenStream || localStream
                      : remoteStreams.get(user.id) || null
                  }
                  isLocal={user.id === currentUser.id}
                  isActiveSpeaker={activeSpeakerId === user.id}
                  isPinned={false}
                  onTogglePin={onTogglePin}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Standard Grid View */
        <div className={`w-full grid gap-2 md:gap-4 ${gridColsClass} items-center justify-center`}>
          {allUsers.map((user) => (
            <ParticipantTile
              key={user.id}
              participant={user}
              stream={
                user.id === currentUser.id
                  ? screenStream || localStream
                  : remoteStreams.get(user.id) || null
              }
              isLocal={user.id === currentUser.id}
              isActiveSpeaker={activeSpeakerId === user.id}
              isPinned={false}
              onTogglePin={onTogglePin}
            />
          ))}
        </div>
      )}
    </div>
  );
};
