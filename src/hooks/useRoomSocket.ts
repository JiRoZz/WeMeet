import { useEffect, useRef, useState, useCallback } from 'react';
import { ChatMessage, EmojiReaction, User, WebRTCSignalingMessage } from '../types';
import { sounds } from '../utils/audio';

interface UseRoomSocketProps {
  roomId: string | null;
  currentUser: User | null;
  onWebRTCSignaling?: (msg: WebRTCSignalingMessage) => void;
}

export function useRoomSocket({ roomId, currentUser, onWebRTCSignaling }: UseRoomSocketProps) {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [participants, setParticipants] = useState<User[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<EmojiReaction[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to send JSON payload
  const send = useCallback((msg: WebRTCSignalingMessage) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(msg));
    }
  }, []);

  useEffect(() => {
    if (!roomId || !currentUser) return;

    function connect() {
      const defaultProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const defaultUrl = `${defaultProtocol}//${window.location.host}/ws`;
      const wsUrl = import.meta.env.VITE_WS_URL || defaultUrl;

      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        // Join room
        send({
          type: 'join_room',
          roomId,
          user: currentUser,
        });
      };

      ws.onmessage = (event) => {
        try {
          const msg: WebRTCSignalingMessage = JSON.parse(event.data);
          const { type, senderUserId } = msg;

          switch (type) {
            case 'room_state': {
              if (msg.users) {
                setParticipants(msg.users);
              }
              if (msg.message) {
                setMessages((prev) => [...prev, msg.message!]);
              }
              break;
            }

            case 'user_joined': {
              if (msg.user) {
                sounds.playJoinChime();
                setParticipants((prev) => {
                  const filtered = prev.filter((p) => p.id !== msg.user!.id);
                  return [...filtered, msg.user!];
                });
              }
              if (msg.message) {
                setMessages((prev) => [...prev, msg.message!]);
              }
              break;
            }

            case 'user_left': {
              if (senderUserId) {
                sounds.playLeaveChime();
                setParticipants((prev) => prev.filter((p) => p.id !== senderUserId));
              }
              if (msg.message) {
                setMessages((prev) => [...prev, msg.message!]);
              }
              break;
            }

            case 'user_state_change': {
              if (senderUserId && msg.userState) {
                setParticipants((prev) =>
                  prev.map((p) => (p.id === senderUserId ? { ...p, ...msg.userState } : p))
                );
              }
              break;
            }

            case 'chat_message': {
              if (msg.message) {
                if (!msg.message.isSystem && msg.message.senderId !== currentUser.id) {
                  sounds.playMessagePing();
                }
                setMessages((prev) => {
                  // Guard idempotency against duplicate delivery
                  if (prev.some((m) => m.id === msg.message!.id)) return prev;
                  return [...prev, msg.message!];
                });
              }
              break;
            }

            case 'reaction': {
              if (msg.reaction) {
                const newReaction = msg.reaction;
                setReactions((prev) => [...prev, newReaction]);
                // Auto expire reaction after 3.5 seconds
                setTimeout(() => {
                  setReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
                }, 3500);
              }
              break;
            }

            case 'typing_status': {
              if (senderUserId && msg.user) {
                if (msg.isTyping) {
                  setTypingUsers((prev) => (prev.includes(msg.user!.name) ? prev : [...prev, msg.user!.name]));
                } else {
                  setTypingUsers((prev) => prev.filter((name) => name !== msg.user!.name));
                }
              }
              break;
            }

            // WebRTC Signaling Events
            case 'webrtc_offer':
            case 'webrtc_answer':
            case 'webrtc_candidate': {
              if (onWebRTCSignaling) {
                onWebRTCSignaling(msg);
              }
              break;
            }

            default:
              break;
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Attempt reconnect after 2 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          if (roomId && currentUser) {
            connect();
          }
        }, 2000);
      };

      ws.onerror = (err) => {
        console.warn('WebSocket connection error:', err);
      };
    }

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [roomId, currentUser?.id]);

  const sendChatMessage = useCallback(
    (text: string, fileAttachment?: any) => {
      if (!roomId || !currentUser) return;
      const newMsg: ChatMessage = {
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatarColor: currentUser.avatarColor,
        text,
        timestamp: Date.now(),
        fileAttachment,
      };

      send({
        type: 'chat_message',
        roomId,
        message: newMsg,
      });
    },
    [roomId, currentUser, send]
  );

  const sendEmojiReaction = useCallback(
    (emoji: string) => {
      if (!roomId || !currentUser) return;
      const reaction: EmojiReaction = {
        id: 'react_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        senderId: currentUser.id,
        senderName: currentUser.name,
        emoji,
        timestamp: Date.now(),
      };

      send({
        type: 'reaction',
        roomId,
        reaction,
      });
    },
    [roomId, currentUser, send]
  );

  const updateUserState = useCallback(
    (userState: Partial<User>) => {
      if (!roomId || !currentUser) return;
      send({
        type: 'user_state_change',
        roomId,
        senderUserId: currentUser.id,
        userState,
      });
    },
    [roomId, currentUser, send]
  );

  const sendTypingStatus = useCallback(
    (isTyping: boolean) => {
      if (!roomId || !currentUser) return;
      send({
        type: 'typing_status',
        roomId,
        senderUserId: currentUser.id,
        user: currentUser,
        isTyping,
      });
    },
    [roomId, currentUser, send]
  );

  return {
    isConnected,
    participants,
    messages,
    reactions,
    typingUsers,
    sendChatMessage,
    sendEmojiReaction,
    updateUserState,
    sendTypingStatus,
    sendWebRTCSignaling: send,
  };
}
