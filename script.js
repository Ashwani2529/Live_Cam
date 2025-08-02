const videoContainer = document.getElementById('videoContainer');
const videoBtn = document.getElementById('videoBtn');
const audioBtn = document.getElementById('audioBtn');
const leaveBtn = document.getElementById('leaveBtn');
const connectionStatus = document.getElementById('connectionStatus');

const signalingServer = new WebSocket('wss://live-cam.onrender.com');
const peerConnections = {};
const videoElements = {};
const userId = Math.random().toString(36).substring(7);

let localStream = null;
let isVideoEnabled = true;
let isAudioEnabled = true;
let participants = new Set();

// WebSocket event handlers
signalingServer.onopen = () => {
    console.log('Connected to signaling server');
    updateConnectionStatus('connected');
    signalingServer.send(JSON.stringify({ type: 'register', id: userId }));
};

signalingServer.onclose = () => {
    console.log('Disconnected from signaling server');
    updateConnectionStatus('disconnected');
};

signalingServer.onerror = (error) => {
    console.error('WebSocket error:', error);
    updateConnectionStatus('disconnected');
};

signalingServer.onmessage = async (message) => {
    const data = JSON.parse(message.data);

    try {
        switch (data.type) {
            case 'existing-participants':
                for (const peerId of data.participants) {
                    if (peerId !== userId) {
                        participants.add(peerId);
                        await setupPeerConnection(peerId, true);
                    }
                }
                updateVideoGrid();
                break;

            case 'new-peer':
                const peerId = data.id;
                if (peerId !== userId && !peerConnections[peerId]) {
                    participants.add(peerId);
                    await setupPeerConnection(peerId, true);
                    updateVideoGrid();
                }
                break;

            case 'signal':
                await handleSignalingMessage(data);
                break;

            case 'peer-disconnected':
                await handlePeerDisconnection(data.id);
                break;

            case 'media-state-changed':
                updatePeerMediaState(data.peerId, data.mediaState);
                break;
        }
    } catch (error) {
        console.error('Error handling message:', error);
    }
};

// Initialize local media and UI
async function initializeApp() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        
        // Create local video element
        createVideoElement(userId, localStream, true);
        participants.add(userId);
        updateVideoGrid();
        
        // Setup control event listeners
        setupControlListeners();
        
    } catch (error) {
        console.error('Error accessing media devices:', error);
        alert('Please allow camera and microphone access to use this application.');
    }
}

// Create video element for participant
function createVideoElement(participantId, stream, isLocal = false) {
    const videoWrapper = document.createElement('div');
    videoWrapper.className = 'video-container';
    videoWrapper.id = `video-wrapper-${participantId}`;

    const video = document.createElement('video');
    video.autoplay = true;
    video.playsInline = true;
    video.muted = isLocal; // Mute local video to prevent feedback
    video.srcObject = stream;

    const overlay = document.createElement('div');
    overlay.className = 'video-overlay';

    const participantName = document.createElement('div');
    participantName.className = 'participant-name';
    participantName.textContent = isLocal ? 'You' : `Participant ${participantId.substring(0, 6)}`;

    const participantStatus = document.createElement('div');
    participantStatus.className = 'participant-status';
    participantStatus.id = `status-${participantId}`;

    overlay.appendChild(participantName);
    overlay.appendChild(participantStatus);
    videoWrapper.appendChild(video);
    videoWrapper.appendChild(overlay);

    videoElements[participantId] = {
        wrapper: videoWrapper,
        video: video,
        status: participantStatus
    };

    videoContainer.appendChild(videoWrapper);
    updateParticipantStatus(participantId, { video: true, audio: true });
}

// Setup peer connection
async function setupPeerConnection(peerId, isInitiator) {
    try {
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        });

        peerConnections[peerId] = pc;

        // Add local stream tracks
        if (localStream) {
            localStream.getTracks().forEach(track => {
                pc.addTrack(track, localStream);
            });
        }

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                signalingServer.send(JSON.stringify({
                    type: 'signal',
                    target: peerId,
                    signal: event.candidate,
                    sender: userId
                }));
            }
        };

        // Handle incoming stream
        pc.ontrack = (event) => {
            console.log('Received remote stream from:', peerId);
            if (!videoElements[peerId]) {
                createVideoElement(peerId, event.streams[0], false);
                updateVideoGrid();
            } else {
                videoElements[peerId].video.srcObject = event.streams[0];
            }
        };

        // Handle connection state changes
        pc.onconnectionstatechange = () => {
            console.log(`Connection state with ${peerId}:`, pc.connectionState);
            if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                handlePeerDisconnection(peerId);
            }
        };

        // Create offer if initiator
        if (isInitiator) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            signalingServer.send(JSON.stringify({
                type: 'signal',
                target: peerId,
                signal: offer,
                sender: userId
            }));
        }

    } catch (error) {
        console.error('Error setting up peer connection:', error);
    }
}

// Handle signaling messages
async function handleSignalingMessage(data) {
    const peerId = data.sender;
    
    if (!peerConnections[peerId]) {
        await setupPeerConnection(peerId, false);
    }

    const pc = peerConnections[peerId];

    try {
        if (data.signal.type === 'offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(data.signal));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            signalingServer.send(JSON.stringify({
                type: 'signal',
                target: peerId,
                signal: answer,
                sender: userId
            }));
        } else if (data.signal.type === 'answer') {
            await pc.setRemoteDescription(new RTCSessionDescription(data.signal));
        } else if (data.signal.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(data.signal));
        }
    } catch (error) {
        console.error('Error handling signaling message:', error);
    }
}

// Handle peer disconnection
async function handlePeerDisconnection(peerId) {
    if (peerConnections[peerId]) {
        peerConnections[peerId].close();
        delete peerConnections[peerId];
    }
    
    if (videoElements[peerId]) {
        videoElements[peerId].wrapper.remove();
        delete videoElements[peerId];
    }
    
    participants.delete(peerId);
    updateVideoGrid();
}

// Update video grid layout based on participant count
function updateVideoGrid() {
    const participantCount = participants.size;
    videoContainer.className = `video-grid participants-${participantCount}`;
}

// Setup control button listeners
function setupControlListeners() {
    videoBtn.addEventListener('click', toggleVideo);
    audioBtn.addEventListener('click', toggleAudio);
    leaveBtn.addEventListener('click', leaveCall);
}

// Toggle video on/off
async function toggleVideo() {
    if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
            isVideoEnabled = !isVideoEnabled;
            videoTrack.enabled = isVideoEnabled;
            
            videoBtn.classList.toggle('off', !isVideoEnabled);
            videoBtn.textContent = isVideoEnabled ? '📹' : '📹';
            
            updateParticipantStatus(userId, { video: isVideoEnabled, audio: isAudioEnabled });
            broadcastMediaState();
        }
    }
}

// Toggle audio on/off
async function toggleAudio() {
    if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            isAudioEnabled = !isAudioEnabled;
            audioTrack.enabled = isAudioEnabled;
            
            audioBtn.classList.toggle('off', !isAudioEnabled);
            audioBtn.textContent = isAudioEnabled ? '🎤' : '🔇';
            
            updateParticipantStatus(userId, { video: isVideoEnabled, audio: isAudioEnabled });
            broadcastMediaState();
        }
    }
}

// Leave the call
function leaveCall() {
    if (confirm('Are you sure you want to leave the call?')) {
        // Close all peer connections
        Object.values(peerConnections).forEach(pc => pc.close());
        
        // Stop local stream
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
        
        // Close WebSocket connection
        signalingServer.close();
        
        // Redirect or reload
        window.location.reload();
    }
}

// Update participant status indicators
function updateParticipantStatus(participantId, mediaState) {
    const statusElement = document.getElementById(`status-${participantId}`);
    if (statusElement) {
        statusElement.innerHTML = '';
        
        if (!mediaState.audio) {
            const audioIndicator = document.createElement('div');
            audioIndicator.className = 'status-indicator muted';
            audioIndicator.textContent = '🔇';
            audioIndicator.title = 'Microphone off';
            statusElement.appendChild(audioIndicator);
        }
        
        if (!mediaState.video) {
            const videoIndicator = document.createElement('div');
            videoIndicator.className = 'status-indicator video-off';
            videoIndicator.textContent = '📹';
            videoIndicator.title = 'Camera off';
            statusElement.appendChild(videoIndicator);
        }
    }
}

// Broadcast media state to other peers
function broadcastMediaState() {
    signalingServer.send(JSON.stringify({
        type: 'media-state-changed',
        peerId: userId,
        mediaState: { video: isVideoEnabled, audio: isAudioEnabled }
    }));
}

// Update peer media state
function updatePeerMediaState(peerId, mediaState) {
    updateParticipantStatus(peerId, mediaState);
}

// Update connection status
function updateConnectionStatus(status) {
    connectionStatus.className = `connection-status ${status}`;
    
    switch (status) {
        case 'connected':
            connectionStatus.textContent = 'Connected';
            break;
        case 'connecting':
            connectionStatus.textContent = 'Connecting...';
            break;
        case 'disconnected':
            connectionStatus.textContent = 'Disconnected';
            break;
    }
}

// Initialize the application
initializeApp();
