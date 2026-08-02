import React, { useState, useEffect, useCallback } from 'react';
import { MediaDeviceOptions, User, VideoFilterType } from './types';
import { generateUserId, getRandomAvatarColor } from './utils/media';
import { sounds } from './utils/audio';

import { useRoomSocket } from './hooks/useRoomSocket';
import { useWebRTCCall } from './hooks/useWebRTCCall';

import { Home } from './components/Home';
import { Lobby } from './components/Lobby';
import { Navbar } from './components/Navbar';
import { VideoGrid } from './components/VideoGrid';
import { CallControls } from './components/CallControls';
import { ChatBox } from './components/ChatBox';
import { ParticipantsDrawer } from './components/ParticipantsDrawer';
import { SettingsModal } from './components/SettingsModal';
import { AuthModal } from './components/AuthModal';
import { AccountModal } from './components/AccountModal';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { currentUser: firebaseUser } = useAuth();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [viewState, setViewState] = useState<'home' | 'lobby' | 'in_call'>('home');

  // Auth & Account Modal states
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [accountInitialTab, setAccountInitialTab] = useState<'profile' | 'friends'>('profile');
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');

  const handleOpenAuth = (mode: 'login' | 'register' = 'login') => {
    setAuthInitialMode(mode);
    setIsAuthOpen(true);
  };

  const handleOpenAccount = (tab: 'profile' | 'friends' = 'profile') => {
    setAccountInitialTab(tab);
    setIsAccountOpen(true);
  };

  // Current user info
  const [currentUser, setCurrentUser] = useState<User>(() => {
    let savedName = 'User';
    try {
      savedName = localStorage.getItem('user_display_name') || 'Guest User';
    } catch (e) {
      console.warn(e);
    }
    return {
      id: generateUserId(),
      name: savedName,
      avatarColor: getRandomAvatarColor(),
      isMuted: false,
      cameraOff: false,
      isHandRaised: false,
      isScreenSharing: false,
      joinedAt: Date.now(),
    };
  });

  useEffect(() => {
    if (firebaseUser) {
      setCurrentUser((prev) => ({
        ...prev,
        id: firebaseUser.uid,
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
        photoURL: firebaseUser.photoURL || undefined,
      }));
    }
  }, [firebaseUser]);

  // UI Drawer & Modal States
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMutedSound, setIsMutedSound] = useState(false);
  const [pinnedUserId, setPinnedUserId] = useState<string | null>(null);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // Device & Filter Options
  const [deviceOptions, setDeviceOptions] = useState<MediaDeviceOptions>({
    audioInputId: '',
    videoInputId: '',
    audioOutputId: '',
  });
  const [activeFilter, setActiveFilter] = useState<VideoFilterType>('none');

  // Parse room ID from URL search query on boot or popstate
  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const urlRoom = params.get('room');
      if (urlRoom) {
        setRoomId(urlRoom);
        setViewState('lobby');
      }
    };

    handleUrlChange();
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  // WebRTC Signaling Callback placeholder (ref bridge)
  const handleSignalingRef = React.useRef<((msg: any) => void) | undefined>(undefined);

  // Initialize Room WebSocket hook
  const {
    isConnected,
    participants,
    messages,
    reactions,
    typingUsers,
    sendChatMessage,
    sendEmojiReaction,
    updateUserState,
    sendTypingStatus,
    sendWebRTCSignaling,
  } = useRoomSocket({
    roomId: viewState === 'in_call' ? roomId : null,
    currentUser,
    onWebRTCSignaling: (msg) => {
      if (handleSignalingRef.current) {
        handleSignalingRef.current(msg);
      }
    },
  });

  // Initialize WebRTC Call hook
  const {
    localStream,
    screenStream,
    remoteStreams,
    isMicMuted,
    isCameraOff,
    isScreenSharing,
    activeSpeakerId,
    initLocalStream,
    handleSignalingMessage,
    toggleMicrophone,
    toggleCamera,
    toggleScreenShare,
  } = useWebRTCCall({
    roomId: viewState === 'in_call' ? roomId : null,
    currentUser,
    participants,
    sendSignaling: sendWebRTCSignaling,
    deviceOptions,
  });

  // Attach WebRTC signaling handler ref
  useEffect(() => {
    handleSignalingRef.current = handleSignalingMessage;
  }, [handleSignalingMessage]);

  // Track unread chat messages when chat panel is closed
  useEffect(() => {
    if (!isChatOpen && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (!lastMsg.isSystem && lastMsg.senderId !== currentUser.id) {
        setUnreadChatCount((prev) => prev + 1);
      }
    }
  }, [messages, isChatOpen, currentUser.id]);

  // Handle Enter Room from Home Page
  const handleEnterRoom = (selectedRoomId: string) => {
    setRoomId(selectedRoomId);
    setViewState('lobby');

    // Update URL query parameter
    const url = new URL(window.location.href);
    url.searchParams.set('room', selectedRoomId);
    window.history.pushState({}, '', url.toString());
  };

  // Handle User Display Name & Avatar Update
  const handleUpdateNameAndAvatar = (name: string, color: string) => {
    setCurrentUser((prev) => ({
      ...prev,
      name,
      avatarColor: color,
    }));
    try {
      localStorage.setItem('user_display_name', name);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleUpdateUserProfile = (updatedProfile: { name: string; username: string; photoURL: string; avatarColor: string }) => {
    setCurrentUser((prev) => {
      const updated = {
        ...prev,
        name: updatedProfile.name,
        username: updatedProfile.username,
        photoURL: updatedProfile.photoURL,
        avatarColor: updatedProfile.avatarColor,
      };
      if (viewState === 'in_call') {
        updateUserState({
          name: updatedProfile.name,
          username: updatedProfile.username,
          photoURL: updatedProfile.photoURL,
          avatarColor: updatedProfile.avatarColor,
        });
      }
      return updated;
    });
    try {
      localStorage.setItem('user_display_name', updatedProfile.name);
      localStorage.setItem('user_username', updatedProfile.username);
      localStorage.setItem('user_photo_url', updatedProfile.photoURL);
      localStorage.setItem('user_avatar_color', updatedProfile.avatarColor);
    } catch (e) {
      console.warn(e);
    }
  };

  // Handle Join Room from Lobby Page
  const handleJoinFromLobby = async (initialMuted: boolean, initialCamOff: boolean) => {
    // Apply mute choices to user state
    const updatedUser = {
      ...currentUser,
      isMuted: initialMuted,
      cameraOff: initialCamOff,
      activeFilter,
    };
    setCurrentUser(updatedUser);

    setViewState('in_call');
    await initLocalStream();

    if (initialMuted) toggleMicrophone();
    if (initialCamOff) toggleCamera();
  };

  // Handle Leave Call Action
  const handleLeaveCall = () => {
    setViewState('home');
    setRoomId(null);
    setIsChatOpen(false);
    setIsParticipantsOpen(false);

    // Clear URL query parameter
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    window.history.pushState({}, '', url.toString());
  };

  // Handle Control Bar Actions
  const handleToggleMicAction = () => {
    const muted = toggleMicrophone();
    setCurrentUser((prev) => ({ ...prev, isMuted: muted }));
    updateUserState({ isMuted: muted });
  };

  const handleToggleCamAction = () => {
    const camOff = toggleCamera();
    setCurrentUser((prev) => ({ ...prev, cameraOff: camOff }));
    updateUserState({ cameraOff: camOff });
  };

  const handleToggleScreenShareAction = async () => {
    const sharing = await toggleScreenShare();
    setCurrentUser((prev) => ({ ...prev, isScreenSharing: sharing }));
    updateUserState({ isScreenSharing: sharing });
  };

  const handleToggleHandRaiseAction = () => {
    const nextHand = !currentUser.isHandRaised;
    if (nextHand) sounds.playHandRaiseSound();
    setCurrentUser((prev) => ({ ...prev, isHandRaised: nextHand }));
    updateUserState({ isHandRaised: nextHand });
  };

  const handleSendEmojiReactionAction = (emoji: string) => {
    sendEmojiReaction(emoji);
  };

  const handleToggleSoundAction = () => {
    const nextMuted = !isMutedSound;
    setIsMutedSound(nextMuted);
    sounds.setMuted(nextMuted);
  };

  const handleTogglePinAction = (targetUserId: string) => {
    setPinnedUserId((prev) => (prev === targetUserId ? null : targetUserId));
  };

  // Render Page State Views
  if (viewState === 'home') {
    return (
      <>
        <Home
          onEnterRoom={handleEnterRoom}
          onOpenAuth={handleOpenAuth}
          onOpenAccount={handleOpenAccount}
        />
        <AuthModal
          isOpen={isAuthOpen}
          initialMode={authInitialMode}
          onClose={() => setIsAuthOpen(false)}
        />
        <AccountModal
          isOpen={isAccountOpen}
          onClose={() => setIsAccountOpen(false)}
          currentUser={currentUser}
          onUpdateUserProfile={handleUpdateUserProfile}
          onOpenAuth={() => handleOpenAuth('login')}
          initialTab={accountInitialTab}
          activeRoomId={roomId}
        />
      </>
    );
  }

  if (viewState === 'lobby' && roomId) {
    return (
      <>
        <Lobby
          roomId={roomId}
          currentUser={currentUser}
          deviceOptions={deviceOptions}
          onUpdateNameAndAvatar={handleUpdateNameAndAvatar}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onJoinRoom={handleJoinFromLobby}
        />
        <SettingsModal
          isOpen={isSettingsOpen}
          deviceOptions={deviceOptions}
          activeFilter={activeFilter}
          onClose={() => setIsSettingsOpen(false)}
          onSaveOptions={(opts, filter) => {
            setDeviceOptions(opts);
            setActiveFilter(filter);
          }}
        />
        <AuthModal
          isOpen={isAuthOpen}
          initialMode={authInitialMode}
          onClose={() => setIsAuthOpen(false)}
        />
        <AccountModal
          isOpen={isAccountOpen}
          onClose={() => setIsAccountOpen(false)}
          currentUser={currentUser}
          onUpdateUserProfile={handleUpdateUserProfile}
          onOpenAuth={() => handleOpenAuth('login')}
          initialTab={accountInitialTab}
          activeRoomId={roomId}
        />
      </>
    );
  }

  // Active Call View Layout
  return (
    <div className="h-[100dvh] w-screen bg-gray-900 text-gray-900 flex flex-col overflow-hidden select-none">
      {/* Top Navbar */}
      <Navbar
        roomId={roomId || 'general'}
        currentUser={currentUser}
        participantCount={participants.length + 1}
        isConnected={isConnected}
        isMutedSound={isMutedSound}
        onToggleSound={handleToggleSoundAction}
        onOpenParticipants={() => setIsParticipantsOpen(!isParticipantsOpen)}
        onLeaveCall={handleLeaveCall}
        onOpenAuth={() => handleOpenAuth('login')}
        onOpenAccount={() => setIsAccountOpen(true)}
      />

      {/* Main Stage & Side Drawers */}
      <div className="flex-1 flex overflow-hidden relative">
        <VideoGrid
          currentUser={currentUser}
          participants={participants}
          localStream={localStream}
          screenStream={screenStream}
          remoteStreams={remoteStreams}
          activeSpeakerId={activeSpeakerId}
          pinnedUserId={pinnedUserId}
          onTogglePin={handleTogglePinAction}
          reactions={reactions}
        />

        {/* Participants Side Drawer */}
        <ParticipantsDrawer
          participants={[currentUser, ...participants.filter((p) => p.id !== currentUser.id)]}
          currentUser={currentUser}
          isOpen={isParticipantsOpen}
          onClose={() => setIsParticipantsOpen(false)}
        />

        {/* Text Chat Side Drawer */}
        <ChatBox
          messages={messages}
          currentUser={currentUser}
          typingUsers={typingUsers}
          isOpen={isChatOpen}
          onClose={() => {
            setIsChatOpen(false);
            setUnreadChatCount(0);
          }}
          onSendMessage={sendChatMessage}
          onSendTypingStatus={sendTypingStatus}
        />
      </div>

      {/* Bottom Control Bar */}
      <CallControls
        isMicMuted={currentUser.isMuted}
        isCameraOff={currentUser.cameraOff}
        isScreenSharing={currentUser.isScreenSharing}
        isHandRaised={currentUser.isHandRaised}
        unreadCount={unreadChatCount}
        participantCount={participants.length + 1}
        isChatOpen={isChatOpen}
        isParticipantsOpen={isParticipantsOpen}
        onToggleMic={handleToggleMicAction}
        onToggleCamera={handleToggleCamAction}
        onToggleScreenShare={handleToggleScreenShareAction}
        onToggleHandRaise={handleToggleHandRaiseAction}
        onSendReaction={handleSendEmojiReactionAction}
        onToggleChat={() => {
          setIsChatOpen(!isChatOpen);
          if (!isChatOpen) setUnreadChatCount(0);
        }}
        onToggleParticipants={() => setIsParticipantsOpen(!isParticipantsOpen)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLeaveCall={handleLeaveCall}
      />

      {/* Device & Video Filter Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        deviceOptions={deviceOptions}
        activeFilter={activeFilter}
        onClose={() => setIsSettingsOpen(false)}
        onSaveOptions={(opts, filter) => {
          setDeviceOptions(opts);
          setActiveFilter(filter);
          setCurrentUser((prev) => ({ ...prev, activeFilter: filter }));
          updateUserState({ activeFilter: filter });
        }}
      />

      <AuthModal
        isOpen={isAuthOpen}
        initialMode={authInitialMode}
        onClose={() => setIsAuthOpen(false)}
      />

      <AccountModal
        isOpen={isAccountOpen}
        onClose={() => setIsAccountOpen(false)}
        currentUser={currentUser}
        onUpdateUserProfile={handleUpdateUserProfile}
        onOpenAuth={() => handleOpenAuth('login')}
        initialTab={accountInitialTab}
        activeRoomId={roomId}
      />
    </div>
  );
}
