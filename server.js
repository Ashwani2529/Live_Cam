const express = require('express');
const WebSocket = require('ws');
const app = express();
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

const clients = new Map();

// Middleware to allow CORS for WebSocket connections
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Serve static files
app.use(express.static('.'));

wss.on('connection', (ws) => {
    let userId;

    console.log('New WebSocket connection established');

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('Received message:', data.type, 'from:', data.sender || 'unknown');

            switch (data.type) {
                case 'register':
                    userId = data.id;
                    clients.set(userId, ws);
                    
                    // Get existing participants (excluding the new user)
                    const existingParticipants = Array.from(clients.keys()).filter((id) => id !== userId);
                    
                    // Send existing participants to the new user
                    if (existingParticipants.length > 0) {
                        ws.send(JSON.stringify({ 
                            type: 'existing-participants', 
                            participants: existingParticipants 
                        }));
                    }
                    
                    // Notify existing participants about the new user (excluding the new user themselves)
                    existingParticipants.forEach(peerId => {
                        const client = clients.get(peerId);
                        if (client && client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ 
                                type: 'new-peer', 
                                id: userId 
                            }));
                        }
                    });
                    
                    console.log(`User ${userId} registered. Total participants: ${clients.size}`);
                    break;

                case 'signal':
                    const target = clients.get(data.target);
                    if (target && target.readyState === WebSocket.OPEN) {
                        target.send(JSON.stringify({ 
                            type: 'signal', 
                            signal: data.signal, 
                            sender: data.sender 
                        }));
                    } else {
                        console.log(`Target ${data.target} not found or connection closed`);
                    }
                    break;

                case 'media-state-changed':
                    // Broadcast media state changes to all other participants
                    clients.forEach((client, peerId) => {
                        if (peerId !== userId && client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({
                                type: 'media-state-changed',
                                peerId: userId,
                                mediaState: data.mediaState
                            }));
                        }
                    });
                    break;

                default:
                    console.log('Unknown message type:', data.type);
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    });

    ws.on('close', () => {
        if (userId) {
            console.log(`User ${userId} disconnected`);
            clients.delete(userId);
            
            // Notify remaining participants about the disconnection
            clients.forEach((client, peerId) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ 
                        type: 'peer-disconnected', 
                        id: userId 
                    }));
                }
            });
            
            console.log(`Total participants after disconnect: ${clients.size}`);
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ 
        status: 'WebSocket signaling server is running',
        connectedClients: clients.size,
        uptime: process.uptime()
    });
});

// API endpoint to get connected clients count
app.get('/status', (req, res) => {
    res.json({
        connectedClients: clients.size,
        uptime: process.uptime()
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Signaling server running on port ${PORT}`);
    console.log(`WebSocket server ready for connections`);
});