import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { ChatMessage, User, WebRTCSignalingMessage } from './src/types.js';

interface ClientConnection {
  ws: WebSocket;
  userId: string;
  roomId: string;
}

interface RoomData {
  id: string;
  createdBy: string;
  createdAt: number;
  participants: Map<string, User>;
  messages: ChatMessage[];
}

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = 3000;

app.use(express.json());

// In-memory room store
const rooms = new Map<string, RoomData>();
const clients = new Set<ClientConnection>();

function getOrCreateRoom(roomId: string, userId: string): RoomData {
  let room = rooms.get(roomId);
  if (!room) {
    room = {
      id: roomId,
      createdBy: userId,
      createdAt: Date.now(),
      participants: new Map(),
      messages: [
        {
          id: 'sys_' + Date.now(),
          senderId: 'system',
          senderName: 'System',
          text: `Welcome to room "${roomId}"! Share the room link to invite participants.`,
          timestamp: Date.now(),
          isSystem: true,
        },
      ],
    };
    rooms.set(roomId, room);
  }
  return room;
}

// REST API endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', activeRooms: rooms.size, totalClients: clients.size });
});

app.get('/api/rooms', (req, res) => {
  const roomList = Array.from(rooms.values()).map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    createdBy: r.createdBy,
    participantCount: r.participants.size,
  }));
  res.json({ rooms: roomList });
});

app.get('/api/rooms/:roomId', (req, res) => {
  const room = rooms.get(req.params.roomId);
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  res.json({
    id: room.id,
    createdAt: room.createdAt,
    createdBy: room.createdBy,
    participantCount: room.participants.size,
    participants: Array.from(room.participants.values()),
  });
});

// WebSocket signaling & real-time communication server
wss.on('connection', (ws) => {
  let clientRef: ClientConnection | null = null;

  ws.on('message', (data: string | Buffer) => {
    try {
      const msg: WebRTCSignalingMessage = JSON.parse(data.toString());
      const { type, roomId, senderUserId, targetUserId } = msg;

      if (!roomId) return;

      if (type === 'join_room' && msg.user) {
        const user = msg.user;
        const room = getOrCreateRoom(roomId, user.id);

        clientRef = { ws, userId: user.id, roomId };
        clients.add(clientRef);

        // Store or update participant
        room.participants.set(user.id, user);

        // Create join system message
        const systemMsg: ChatMessage = {
          id: 'sys_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
          senderId: 'system',
          senderName: 'System',
          text: `${user.name} joined the room`,
          timestamp: Date.now(),
          isSystem: true,
        };
        room.messages.push(systemMsg);
        if (room.messages.length > 200) room.messages.shift();

        // 1. Send initial room state to joining client
        const statePayload: WebRTCSignalingMessage = {
          type: 'room_state',
          roomId,
          users: Array.from(room.participants.values()),
          message: systemMsg,
        };
        ws.send(JSON.stringify(statePayload));

        // Send existing message history
        room.messages.forEach((m) => {
          ws.send(
            JSON.stringify({
              type: 'chat_message',
              roomId,
              message: m,
            })
          );
        });

        // 2. Broadcast user_joined to other clients in room
        broadcastToRoom(roomId, user.id, {
          type: 'user_joined',
          roomId,
          senderUserId: user.id,
          user,
          message: systemMsg,
        });

        return;
      }

      // Ensure client is associated with room
      const room = rooms.get(roomId);
      if (!room) return;

      switch (type) {
        case 'chat_message': {
          if (msg.message) {
            room.messages.push(msg.message);
            if (room.messages.length > 200) room.messages.shift();
            broadcastToRoom(roomId, null, {
              type: 'chat_message',
              roomId,
              message: msg.message,
            });
          }
          break;
        }

        case 'reaction': {
          if (msg.reaction) {
            broadcastToRoom(roomId, null, {
              type: 'reaction',
              roomId,
              reaction: msg.reaction,
            });
          }
          break;
        }

        case 'user_state_change': {
          if (senderUserId && msg.userState) {
            const existingUser = room.participants.get(senderUserId);
            if (existingUser) {
              const updatedUser = { ...existingUser, ...msg.userState };
              room.participants.set(senderUserId, updatedUser);

              broadcastToRoom(roomId, senderUserId, {
                type: 'user_state_change',
                roomId,
                senderUserId,
                userState: msg.userState,
                user: updatedUser,
              });
            }
          }
          break;
        }

        case 'typing_status': {
          if (senderUserId) {
            broadcastToRoom(roomId, senderUserId, {
              type: 'typing_status',
              roomId,
              senderUserId,
              user: msg.user,
              isTyping: msg.isTyping,
            });
          }
          break;
        }

        // WebRTC Signaling: Offer, Answer, Candidate
        case 'webrtc_offer':
        case 'webrtc_answer':
        case 'webrtc_candidate': {
          if (targetUserId) {
            sendToUser(roomId, targetUserId, msg);
          } else {
            broadcastToRoom(roomId, senderUserId || null, msg);
          }
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  });

  ws.on('close', () => {
    if (clientRef) {
      clients.delete(clientRef);
      const { roomId, userId } = clientRef;
      const room = rooms.get(roomId);

      if (room) {
        const user = room.participants.get(userId);
        room.participants.delete(userId);

        if (user) {
          const leaveMsg: ChatMessage = {
            id: 'sys_leave_' + Date.now(),
            senderId: 'system',
            senderName: 'System',
            text: `${user.name} left the room`,
            timestamp: Date.now(),
            isSystem: true,
          };
          room.messages.push(leaveMsg);

          broadcastToRoom(roomId, userId, {
            type: 'user_left',
            roomId,
            senderUserId: userId,
            message: leaveMsg,
          });
        }

        // Clean up empty rooms after 1 hour if empty
        if (room.participants.size === 0) {
          setTimeout(() => {
            const currentRoom = rooms.get(roomId);
            if (currentRoom && currentRoom.participants.size === 0) {
              rooms.delete(roomId);
            }
          }, 3600000);
        }
      }
    }
  });
});

function broadcastToRoom(roomId: string, excludeUserId: string | null, message: WebRTCSignalingMessage) {
  const jsonStr = JSON.stringify(message);
  for (const client of clients) {
    if (client.roomId === roomId && client.ws.readyState === WebSocket.OPEN) {
      if (!excludeUserId || client.userId !== excludeUserId) {
        client.ws.send(jsonStr);
      }
    }
  }
}

function sendToUser(roomId: string, targetUserId: string, message: WebRTCSignalingMessage) {
  const jsonStr = JSON.stringify(message);
  for (const client of clients) {
    if (client.roomId === roomId && client.userId === targetUserId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(jsonStr);
      break;
    }
  }
}

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Group Chat & Call Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
