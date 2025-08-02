const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// WebSocket Server setup
const wss = new WebSocket.Server({ server });

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json());

// Trust proxy for rate limiting (fix X-Forwarded-For error)
app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  skip: (req) => {
    // Skip rate limiting for local development
    return process.env.NODE_ENV === 'development';
  }
});
app.use(limiter);

// Store connected clients and rooms
const clients = new Map();
const rooms = new Map();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    message: 'Video call server is running',
    connectedClients: clients.size,
    activeRooms: rooms.size,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Get room status
app.get('/api/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  
  if (room) {
    res.json({
      roomId,
      participants: room.participants.length,
      createdAt: room.createdAt
    });
  } else {
    res.status(404).json({ error: 'Room not found' });
  }
});

// Test endpoint for debugging
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Server is working!',
    socketConnections: clients.size,
    activeRooms: rooms.size,
    timestamp: new Date().toISOString()
  });
});

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('🔗 New WebSocket connection established');
  
  let currentUser = null;
  let currentRoom = 'default-room';

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received message:', data.type, 'from:', data.sender || data.id || 'unknown');

      switch (data.type) {
        case 'register':
          const { id, roomId = 'default-room' } = data;
          currentUser = { id, ws };
          currentRoom = roomId;
          
          // Store client info
          clients.set(id, ws);
          
          // Initialize room if it doesn't exist
          if (!rooms.has(currentRoom)) {
            rooms.set(currentRoom, {
              participants: [],
              createdAt: new Date().toISOString()
            });
          }
          
          const room = rooms.get(currentRoom);
          
          // Check if user was already in room (reconnection)
          const existingParticipantIndex = room.participants.findIndex(p => p.id === id);
          const wasReconnection = existingParticipantIndex !== -1;
          
          if (wasReconnection) {
            // Update WebSocket for reconnected user
            room.participants[existingParticipantIndex].ws = ws;
            console.log(`🔄 User ${id} reconnected to room ${currentRoom}`);
            
            // Notify other participants about reconnection
            room.participants.forEach(participant => {
              if (participant.id !== id && participant.ws.readyState === WebSocket.OPEN) {
                participant.ws.send(JSON.stringify({
                  type: 'peer-reconnecting',
                  peerId: id
                }));
              }
            });
          } else {
            // Add new participant
            room.participants.push({ id, ws });
            console.log(`✅ User ${id} joined room ${currentRoom}`);
          }
          
          // Get existing participants (excluding current user)
          const existingParticipants = room.participants
            .filter(p => p.id !== id)
            .map(p => p.id);
          
          console.log(`Room ${currentRoom} status:`, {
            totalParticipants: room.participants.length,
            existingParticipants,
            isReconnection: wasReconnection
          });
          
          // Send existing participants to the new/reconnecting user
          if (existingParticipants.length > 0) {
            ws.send(JSON.stringify({
              type: 'existing-participants',
              participants: existingParticipants,
              roomId: currentRoom
            }));
          }
          
          // Notify existing participants about new user (not for reconnections)
          if (!wasReconnection) {
            room.participants.forEach(participant => {
              if (participant.id !== id && participant.ws.readyState === WebSocket.OPEN) {
                participant.ws.send(JSON.stringify({
                  type: 'new-peer',
                  id: id,
                  roomId: currentRoom
                }));
              }
            });
          }
          
          // Send room status
          ws.send(JSON.stringify({
            type: 'room-status',
            message: existingParticipants.length === 0 
              ? 'You are the first participant in this room'
              : `Connected to room with ${existingParticipants.length} other participant${existingParticipants.length !== 1 ? 's' : ''}`,
            participantCount: room.participants.length,
            roomId: currentRoom
          }));
          
          break;

        case 'signal':
          const { target, signal, sender } = data;
          console.log(`📡 Relaying signal from ${sender} to ${target}:`, signal.type || 'ICE candidate');
          
          // Find target client
          const targetWs = clients.get(target);
          if (targetWs && targetWs.readyState === WebSocket.OPEN) {
            targetWs.send(JSON.stringify({
              type: 'signal',
              signal,
              sender,
              target
            }));
          } else {
            console.warn(`Target participant ${target} not found or disconnected`);
          }
          break;

        case 'media-state-changed':
          const { mediaState } = data;
          console.log(`🎥 Media state changed for ${currentUser?.id}:`, mediaState);
          
          // Broadcast to all other participants in the room
          if (currentUser && currentRoom) {
            const room = rooms.get(currentRoom);
            if (room) {
              room.participants.forEach(participant => {
                if (participant.id !== currentUser.id && participant.ws.readyState === WebSocket.OPEN) {
                  participant.ws.send(JSON.stringify({
                    type: 'media-state-changed',
                    peerId: currentUser.id,
                    mediaState
                  }));
                }
              });
            }
          }
          break;

        default:
          console.warn('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Failed to process message' 
      }));
    }
  });

  // Handle disconnection
  ws.on('close', (code, reason) => {
    console.log(`🚪 WebSocket disconnected: code ${code}, reason: ${reason}`);
    
    if (currentUser && currentRoom) {
      // Remove from clients map
      clients.delete(currentUser.id);
      
      // Remove from room
      const room = rooms.get(currentRoom);
      if (room) {
        const participantIndex = room.participants.findIndex(p => p.id === currentUser.id);
        if (participantIndex !== -1) {
          const participant = room.participants[participantIndex];
          room.participants.splice(participantIndex, 1);
          
          console.log(`🗑️ Removed ${participant.id} from room ${currentRoom}`);
          
          // Notify other participants
          room.participants.forEach(p => {
            if (p.ws.readyState === WebSocket.OPEN) {
              p.ws.send(JSON.stringify({
                type: 'peer-disconnected',
                id: participant.id,
                roomId: currentRoom
              }));
            }
          });
          
          // Clean up empty rooms
          if (room.participants.length === 0) {
            rooms.delete(currentRoom);
            console.log(`🗑️ Deleted empty room: ${currentRoom}`);
          }
        }
      }
    }
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error(`❌ WebSocket error:`, error);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Express error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 WebSocket server ready for connections`);
}); 