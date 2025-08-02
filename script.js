const videoContainer = document.getElementById('videoContainer');
const videoBtn = document.getElementById('videoBtn');
const audioBtn = document.getElementById('audioBtn');
const leaveBtn = document.getElementById('leaveBtn');
const connectionStatus = document.getElementById('connectionStatus');

// Dynamic WebSocket URL based on current domain
const getWebSocketUrl = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    
    // Use the same domain for WebSocket or fallback to render.com
    if (host.includes('vercel.app') || host.includes('localhost') || host.includes('127.0.0.1')) {
        return 'wss://live-cam.onrender.com';
    }
    return `${protocol}//${host}`;
};

const signalingServer = new WebSocket(getWebSocketUrl());
const peerConnections = {};
const videoElements = {};
const userId = Math.random().toString(36).substring(7);

let localStream = null;
let isVideoEnabled = true;
let isAudioEnabled = true;
let participants = new Set();

console.log('Connecting to WebSocket:', getWebSocketUrl());
console.log('User ID:', userId);

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
    try {
        const data = JSON.parse(message.data);
        console.log('Received WebSocket message:', data.type, data);

        switch (data.type) {
            case 'existing-participants':
                console.log('Existing participants:', data.participants);
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
                console.log('New peer joined:', peerId);
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
                console.log('Peer disconnected:', data.id);
                await handlePeerDisconnection(data.id);
                break;

            case 'media-state-changed':
                console.log('Media state changed for peer:', data.peerId, data.mediaState);
                updatePeerMediaState(data.peerId, data.mediaState);
                break;

            default:
                console.warn('Unknown message type:', data.type);
        }
    } catch (error) {
        console.error('Error handling WebSocket message:', error, message.data);
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
    
    // Add accessibility attributes
    videoWrapper.setAttribute('role', 'gridcell');
    videoWrapper.setAttribute('tabindex', '0');
    videoWrapper.setAttribute('aria-label', isLocal ? 'Your video' : `Video of participant ${participantId.substring(0, 6)}`);

    const video = document.createElement('video');
    video.autoplay = true;
    video.playsInline = true;
    video.muted = isLocal; // Mute local video to prevent feedback
    video.srcObject = stream;
    video.setAttribute('aria-label', isLocal ? 'Your video stream' : `Video stream of participant ${participantId.substring(0, 6)}`);
    video.setAttribute('role', 'img');

    const overlay = document.createElement('div');
    overlay.className = 'video-overlay';
    overlay.setAttribute('aria-hidden', 'true'); // Decorative overlay

    const participantName = document.createElement('div');
    participantName.className = 'participant-name';
    participantName.textContent = isLocal ? 'You' : `Participant ${participantId.substring(0, 6)}`;
    participantName.setAttribute('aria-label', isLocal ? 'Your video' : `Participant ${participantId.substring(0, 6)}`);

    const participantStatus = document.createElement('div');
    participantStatus.className = 'participant-status';
    participantStatus.id = `status-${participantId}`;
    participantStatus.setAttribute('aria-live', 'polite');
    participantStatus.setAttribute('aria-label', 'Media status');

    overlay.appendChild(participantName);
    overlay.appendChild(participantStatus);
    videoWrapper.appendChild(video);
    videoWrapper.appendChild(overlay);

    // Add keyboard navigation
    videoWrapper.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            videoWrapper.focus();
        }
    });

    // Add focus styling
    videoWrapper.addEventListener('focus', () => {
        videoWrapper.style.outline = '3px solid #007bff';
        videoWrapper.style.outlineOffset = '2px';
    });

    videoWrapper.addEventListener('blur', () => {
        videoWrapper.style.outline = 'none';
    });

    videoElements[participantId] = {
        wrapper: videoWrapper,
        video: video,
        status: participantStatus
    };

    videoContainer.appendChild(videoWrapper);
    updateParticipantStatus(participantId, { video: true, audio: true });
    
    console.log(`Created video element for ${isLocal ? 'local user' : 'participant'} ${participantId}`);
}

// Setup peer connection
async function setupPeerConnection(peerId, isInitiator) {
    try {
        console.log(`Setting up peer connection with ${peerId}, isInitiator: ${isInitiator}`);
        
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' }
            ]
        });

        peerConnections[peerId] = pc;

        // Add local stream tracks
        if (localStream) {
            console.log(`Adding ${localStream.getTracks().length} tracks to peer connection with ${peerId}`);
            localStream.getTracks().forEach((track, index) => {
                console.log(`Adding track ${index}: ${track.kind} - ${track.label}`);
                pc.addTrack(track, localStream);
            });
        } else {
            console.error('No local stream available when setting up peer connection');
        }

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log(`Sending ICE candidate to ${peerId}:`, event.candidate.candidate);
                signalingServer.send(JSON.stringify({
                    type: 'signal',
                    target: peerId,
                    signal: event.candidate,
                    sender: userId
                }));
            } else {
                console.log(`ICE gathering complete for ${peerId}`);
            }
        };

        // Handle incoming stream
        pc.ontrack = (event) => {
            console.log('Received remote stream from:', peerId, 'Stream tracks:', event.streams[0].getTracks().length);
            event.streams[0].getTracks().forEach((track, index) => {
                console.log(`Remote track ${index}: ${track.kind} - enabled: ${track.enabled}`);
            });
            
            if (!videoElements[peerId]) {
                createVideoElement(peerId, event.streams[0], false);
                updateVideoGrid();
            } else {
                console.log('Updating existing video element for', peerId);
                videoElements[peerId].video.srcObject = event.streams[0];
            }
        };

        // Handle connection state changes
        pc.onconnectionstatechange = () => {
            console.log(`Connection state with ${peerId}:`, pc.connectionState);
            if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                console.log(`Peer ${peerId} connection failed or disconnected`);
                handlePeerDisconnection(peerId);
            } else if (pc.connectionState === 'connected') {
                console.log(`Successfully connected to peer ${peerId}`);
            }
        };

        // Handle ICE connection state changes
        pc.oniceconnectionstatechange = () => {
            console.log(`ICE connection state with ${peerId}:`, pc.iceConnectionState);
        };

        // Create offer if initiator
        if (isInitiator) {
            console.log(`Creating offer for ${peerId}`);
            const offer = await pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            await pc.setLocalDescription(offer);
            console.log(`Sending offer to ${peerId}`);
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
    console.log(`Handling signaling message from ${peerId}:`, data.signal.type || 'ICE candidate');
    
    if (!peerConnections[peerId]) {
        console.log(`Creating new peer connection for ${peerId}`);
        await setupPeerConnection(peerId, false);
    }

    const pc = peerConnections[peerId];

    if (!pc) {
        console.error(`No peer connection found for ${peerId}`);
        return;
    }

    try {
        if (data.signal.type === 'offer') {
            console.log(`Received offer from ${peerId}`);
            if (pc.signalingState !== 'stable') {
                console.log(`Peer connection not in stable state: ${pc.signalingState}, ignoring offer`);
                return;
            }
            
            await pc.setRemoteDescription(new RTCSessionDescription(data.signal));
            console.log(`Set remote description for ${peerId}`);
            
            // Process any queued ICE candidates
            if (pc.pendingIceCandidates) {
                console.log(`Processing ${pc.pendingIceCandidates.length} queued ICE candidates for ${peerId}`);
                for (const candidate of pc.pendingIceCandidates) {
                    try {
                        await pc.addIceCandidate(new RTCIceCandidate(candidate));
                    } catch (err) {
                        console.error(`Error adding queued ICE candidate for ${peerId}:`, err);
                    }
                }
                pc.pendingIceCandidates = [];
            }
            
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            console.log(`Created and set local answer for ${peerId}`);
            
            signalingServer.send(JSON.stringify({
                type: 'signal',
                target: peerId,
                signal: answer,
                sender: userId
            }));
            console.log(`Sent answer to ${peerId}`);
            
        } else if (data.signal.type === 'answer') {
            console.log(`Received answer from ${peerId}`);
            if (pc.signalingState !== 'have-local-offer') {
                console.log(`Unexpected answer in signaling state: ${pc.signalingState}`);
                return;
            }
            
            await pc.setRemoteDescription(new RTCSessionDescription(data.signal));
            console.log(`Set remote description (answer) for ${peerId}`);
            
            // Process any queued ICE candidates
            if (pc.pendingIceCandidates) {
                console.log(`Processing ${pc.pendingIceCandidates.length} queued ICE candidates for ${peerId}`);
                for (const candidate of pc.pendingIceCandidates) {
                    try {
                        await pc.addIceCandidate(new RTCIceCandidate(candidate));
                    } catch (err) {
                        console.error(`Error adding queued ICE candidate for ${peerId}:`, err);
                    }
                }
                pc.pendingIceCandidates = [];
            }
            
        } else if (data.signal.candidate) {
            console.log(`Received ICE candidate from ${peerId}:`, data.signal.candidate);
            
            if (pc.remoteDescription) {
                await pc.addIceCandidate(new RTCIceCandidate(data.signal));
                console.log(`Added ICE candidate for ${peerId}`);
            } else {
                console.log(`Queuing ICE candidate for ${peerId} (no remote description yet)`);
                // Queue the candidate for later if remote description isn't set yet
                if (!pc.pendingIceCandidates) {
                    pc.pendingIceCandidates = [];
                }
                pc.pendingIceCandidates.push(data.signal);
            }
        }
    } catch (error) {
        console.error(`Error handling signaling message from ${peerId}:`, error);
        console.error('Message data:', data);
        console.error('Peer connection state:', {
            signalingState: pc.signalingState,
            connectionState: pc.connectionState,
            iceConnectionState: pc.iceConnectionState
        });
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
    const maxSupportedParticipants = 16;
    const effectiveCount = Math.min(participantCount, maxSupportedParticipants);
    
    videoContainer.className = `video-grid participants-${effectiveCount}`;
    
    // Add accessibility attributes
    videoContainer.setAttribute('aria-label', `Video call with ${participantCount} participant${participantCount !== 1 ? 's' : ''}`);
    videoContainer.setAttribute('role', 'grid');
    
    console.log(`Updated video grid layout for ${participantCount} participants`);
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
            videoBtn.setAttribute('aria-pressed', isVideoEnabled.toString());
            videoBtn.setAttribute('aria-label', `Video is ${isVideoEnabled ? 'on' : 'off'}. Click to turn ${isVideoEnabled ? 'off' : 'on'}`);
            
            updateParticipantStatus(userId, { video: isVideoEnabled, audio: isAudioEnabled });
            broadcastMediaState();
            
            console.log(`Video ${isVideoEnabled ? 'enabled' : 'disabled'}`);
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
            audioBtn.setAttribute('aria-pressed', isAudioEnabled.toString());
            audioBtn.setAttribute('aria-label', `Microphone is ${isAudioEnabled ? 'on' : 'off'}. Click to turn ${isAudioEnabled ? 'off' : 'on'}`);
            
            updateParticipantStatus(userId, { video: isVideoEnabled, audio: isAudioEnabled });
            broadcastMediaState();
            
            console.log(`Audio ${isAudioEnabled ? 'enabled' : 'disabled'}`);
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
