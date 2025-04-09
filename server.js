const e = require('express');
const express = require('express');
const WebSocket = require('ws');
const app = express();
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

const clients = new Map();

// Middleware to allow CORS for WebSocket connections
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});

wss.on('connection', (ws) => {
    let userId;

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'register') {
            userId = data.id;
            // Notify the new participant about existing participants
            const existingParticipants = Array.from(clients.keys()).filter((id) => id !== userId);
            clients.set(userId, ws);
            if (existingParticipants.length > 0) {
                ws.send(JSON.stringify({ type: 'existing-participants', participants: existingParticipants }));
            }
            // Notify existing participants about the new participant
            clients.forEach((client, id) => {
                    client.send(JSON.stringify({ type: 'new-peer', id: userId }));
            });
        }
         else if (data.type === 'signal') {
            const target = clients.get(data.target);
            if (target) {
                target.send(JSON.stringify({ type: 'signal', signal: data.signal, sender: data.sender }));
            }
        }
    });

    ws.on('close', () => {
        if (userId) {
            clients.delete(userId);
            clients.forEach((client) => {
                client.send(JSON.stringify({ type: 'peer-disconnected', id: userId }));
            });
        }        
    });
});
app.get('/', (req, res) => res.send('WebSocket signaling server running'));

server.listen(3000, () => console.log('Server running on port 3000'));
