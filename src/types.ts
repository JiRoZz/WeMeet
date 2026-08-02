export interface User {
  id: string;
  name: string;
  username?: string;
  avatarColor: string;
  isMuted: boolean;
  cameraOff: boolean;
  isHandRaised: boolean;
  isScreenSharing: boolean;
  activeFilter?: string;
  photoURL?: string;
  joinedAt: number;
}

export interface Friend {
  id: string;
  uid?: string;
  username: string;
  displayName: string;
  photoURL?: string;
  avatarColor?: string;
  addedAt: number;
  status?: 'online' | 'offline' | 'in_call';
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatarColor?: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
  fileAttachment?: {
    name: string;
    type: 'image' | 'file';
    url: string;
    size?: number;
  };
}

export interface EmojiReaction {
  id: string;
  senderId: string;
  senderName: string;
  emoji: string;
  timestamp: number;
}

export interface Room {
  id: string;
  name: string;
  createdAt: number;
  createdBy: string;
  participantCount: number;
}

export type WebRTCSignalingType =
  | 'join_room'
  | 'room_state'
  | 'user_joined'
  | 'user_left'
  | 'user_state_change'
  | 'chat_message'
  | 'reaction'
  | 'typing_status'
  | 'webrtc_offer'
  | 'webrtc_answer'
  | 'webrtc_candidate';

export interface WebRTCSignalingMessage {
  type: WebRTCSignalingType;
  roomId: string;
  senderUserId?: string;
  targetUserId?: string;
  user?: User;
  users?: User[];
  message?: ChatMessage;
  reaction?: EmojiReaction;
  isTyping?: boolean;
  userState?: Partial<User>;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

export interface MediaDeviceOptions {
  audioInputId: string;
  videoInputId: string;
  audioOutputId: string;
}

export type VideoFilterType = 'none' | 'blur' | 'warm' | 'cool' | 'grayscale' | 'sepia' | 'cyber';
