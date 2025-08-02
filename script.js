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
    console.log('🔗 Connected to signaling server');
    console.log('🆔 Registering user:', userId);
    updateConnectionStatus('connected');
    
    // Register with the server
    signalingServer.send(JSON.stringify({ 
        type: 'register', 
        id: userId,
        timestamp: Date.now()
    }));
    
    // Clear any previous connection state
    console.log('🧹 Clearing previous connection state...');
    Object.keys(peerConnections).forEach(peerId => {
        if (peerConnections[peerId].connectionState !== 'connected') {
            console.log(`🗑️ Removing stale connection: ${peerId}`);
            peerConnections[peerId].close();
            delete peerConnections[peerId];
        }
    });
};

signalingServer.onclose = (event) => {
    console.log('❌ Disconnected from signaling server', event.code, event.reason);
    updateConnectionStatus('disconnected');
    
    // Attempt to reconnect if not a clean close
    if (event.code !== 1000) {
        console.log('🔄 Attempting to reconnect in 3 seconds...');
        setTimeout(() => {
            if (signalingServer.readyState === WebSocket.CLOSED) {
                window.location.reload();
            }
        }, 3000);
    }
};

signalingServer.onerror = (error) => {
    console.error('🚨 WebSocket error:', error);
    updateConnectionStatus('disconnected');
};

signalingServer.onmessage = async (message) => {
    try {
        const data = JSON.parse(message.data);
        console.log('Received WebSocket message:', data.type, data);

        switch (data.type) {
            case 'existing-participants':
                console.log('📡 Received existing participants:', data.participants);
                console.log('🆔 Current user ID:', userId);
                console.log('👥 Current participants before processing:', Array.from(participants));
                
                if (data.participants && data.participants.length > 0) {
                    console.log(`🔄 Processing ${data.participants.length} existing participants...`);
                    updateConnectionStatus('loading-participants', `Connecting to ${data.participants.length} participants...`);
                    
                    // Process each existing participant
                    for (const peerId of data.participants) {
                        if (peerId !== userId && peerId) {
                            console.log(`✅ Adding existing participant: ${peerId}`);
                            participants.add(peerId);
                            
                            // Close any existing connection first (in case of reconnection)
                            if (peerConnections[peerId]) {
                                console.log(`🔄 Closing existing connection with ${peerId} for reconnection`);
                                peerConnections[peerId].close();
                                delete peerConnections[peerId];
                            }
                            
                            // Set up new peer connection as initiator
                            try {
                                await setupPeerConnection(peerId, true);
                            } catch (error) {
                                console.error(`❌ Failed to setup connection with ${peerId}:`, error);
                                // Don't remove from participants, might succeed later
                            }
                        } else {
                            console.log(`⏭️ Skipping self or invalid peer: ${peerId}`);
                        }
                    }
                    
                    console.log('👥 Participants after processing existing:', Array.from(participants));
                    console.log('🔗 Peer connections:', Object.keys(peerConnections));
                    
                    // Update the grid layout
                    updateVideoGrid();
                    
                    // Set timeout to check if connections were successful
                    setTimeout(() => {
                        const connectedPeers = Object.keys(peerConnections).filter(peerId => 
                            peerConnections[peerId].connectionState === 'connected'
                        );
                        const totalPeers = data.participants.length;
                        
                        if (connectedPeers.length < totalPeers) {
                            console.log(`⚠️ Only ${connectedPeers.length}/${totalPeers} peers connected successfully`);
                            updateConnectionStatus('connected', `Connected (${connectedPeers.length}/${totalPeers} peers)`);
                        } else {
                            updateConnectionStatus('connected', `Connected to ${totalPeers} participants`);
                        }
                    }, 5000);
                    
                } else {
                    console.log('👤 No existing participants, user is alone in the call');
                    updateConnectionStatus('connected', 'Connected - First participant');
                }
                break;

            case 'new-peer':
                const peerId = data.id;
                const isReconnection = data.isReconnection || false;
                console.log(`🆕 ${isReconnection ? 'Peer reconnected' : 'New peer joined'}:`, peerId);
                console.log('🆔 Current user ID:', userId);
                console.log('🔗 Existing peer connections:', Object.keys(peerConnections));
                console.log('👥 Current participants:', Array.from(participants));
                
                if (peerId !== userId && peerId) {
                    if (peerConnections[peerId]) {
                        if (isReconnection) {
                            console.log(`🔄 Handling reconnection for ${peerId}, closing existing connection`);
                            peerConnections[peerId].close();
                            delete peerConnections[peerId];
                            
                            // Remove and re-add participant
                            participants.delete(peerId);
                            if (videoElements[peerId]) {
                                videoElements[peerId].wrapper.remove();
                                delete videoElements[peerId];
                            }
                        } else {
                            console.log(`⚠️ Peer connection already exists for: ${peerId}, skipping`);
                            return;
                        }
                    }
                    
                    console.log(`✅ Setting up connection with ${isReconnection ? 'reconnected' : 'new'} peer: ${peerId}`);
                    participants.add(peerId);
                    await setupPeerConnection(peerId, true);
                    updateVideoGrid();
                } else if (peerId === userId) {
                    console.log(`⏭️ Ignoring new-peer message for self: ${peerId}`);
                } else {
                    console.log(`❌ Invalid peer ID: ${peerId}`);
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

            case 'peer-reconnecting':
                const reconnectingPeerId = data.peerId;
                console.log(`🔄 Peer ${reconnectingPeerId} is reconnecting - cleaning up old connection`);
                
                // Clean up the old connection and video element
                if (peerConnections[reconnectingPeerId]) {
                    console.log(`🗑️ Closing old connection to ${reconnectingPeerId}`);
                    peerConnections[reconnectingPeerId].close();
                    delete peerConnections[reconnectingPeerId];
                }
                
                if (videoElements[reconnectingPeerId]) {
                    console.log(`🗑️ Removing old video element for ${reconnectingPeerId}`);
                    videoElements[reconnectingPeerId].wrapper.remove();
                    delete videoElements[reconnectingPeerId];
                }
                
                // Remove from participants - they'll be re-added when new connection is established
                participants.delete(reconnectingPeerId);
                updateVideoGrid();
                break;

            case 'room-status':
                console.log('📢 Room status:', data.message);
                updateConnectionStatus('connected', data.message);
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
        console.log('🚀 Initializing application...');
        console.log('🆔 User ID:', userId);
        
        // Clear any existing state from previous sessions
        participants.clear();
        Object.keys(peerConnections).forEach(peerId => {
            peerConnections[peerId].close();
            delete peerConnections[peerId];
        });
        Object.keys(videoElements).forEach(peerId => {
            if (videoElements[peerId].wrapper.parentNode) {
                videoElements[peerId].wrapper.remove();
            }
            delete videoElements[peerId];
        });
        
        // Get user media first
        localStream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 1280, max: 1920 }, 
                height: { ideal: 720, max: 1080 }
            }, 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });
        
        console.log('📹 Got local stream:', localStream);
        console.log('🎵 Local stream tracks:', localStream.getTracks().map(t => `${t.kind}: ${t.enabled}`));
        
        // Create local video element
        createVideoElement(userId, localStream, true);
        participants.add(userId);
        updateVideoGrid();
        
        // Setup control event listeners
        setupControlListeners();
        
        console.log('✅ Application initialized successfully');
        
        // Set up periodic connection health check
        setInterval(checkConnectionHealth, 30000);
        
        // Set up periodic stream verification
        setInterval(() => {
            if (participants.size > 1) {
                console.log('🔍 Periodic stream verification...');
                
                let needsFixing = false;
                Object.keys(videoElements).forEach(peerId => {
                    if (peerId !== userId) {
                        const videoEl = videoElements[peerId].video;
                        if (videoEl.srcObject && videoEl.videoWidth === 0) {
                            const videoTracks = videoEl.srcObject.getVideoTracks();
                            if (videoTracks.some(t => t.readyState === 'live')) {
                                console.log(`⚠️ Stream issue detected for ${peerId} - will auto-fix`);
                                needsFixing = true;
                            }
                        }
                    }
                });
                
                if (needsFixing) {
                    setTimeout(verifyVideoStreams, 1000);
                }
            }
        }, 10000); // Check every 10 seconds
        
        // Show help overlay if user is alone for too long
        setTimeout(() => {
            if (participants.size <= 1) {
                showHelpOverlay();
            }
        }, 15000); // Show after 15 seconds if alone
        
    } catch (error) {
        console.error('🚨 Error accessing media devices:', error);
        
        // Show user-friendly error message
        const errorMessage = error.name === 'NotAllowedError' 
            ? 'Please allow camera and microphone access to join the video call.'
            : 'Unable to access your camera or microphone. Please check your device settings.';
        
        alert(errorMessage);
        
        // Try with lower constraints
        try {
            console.log('🔄 Attempting fallback media access...');
            localStream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 640, height: 480 }, 
                audio: false 
            });
            console.log('📹 Got fallback stream (video only)');
            createVideoElement(userId, localStream, true);
            participants.add(userId);
            updateVideoGrid();
            setupControlListeners();
        } catch (fallbackError) {
            console.error('❌ Fallback media access failed:', fallbackError);
            updateConnectionStatus('disconnected');
        }
    }
}

// Check connection health and attempt to fix issues
function checkConnectionHealth() {
    console.log('🔍 Checking connection health...');
    
    // Check WebSocket connection
    if (signalingServer.readyState !== WebSocket.OPEN) {
        console.log('⚠️ WebSocket not connected, attempting reload...');
        window.location.reload();
        return;
    }
    
    // Check if we have any stale peer connections
    Object.keys(peerConnections).forEach(peerId => {
        const pc = peerConnections[peerId];
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
            console.log(`🔄 Removing failed connection: ${peerId}`);
            handlePeerDisconnection(peerId);
        }
    });
    
    // Verify we have local stream
    if (!localStream || localStream.getTracks().length === 0) {
        console.log('⚠️ Local stream missing, reinitializing...');
        initializeApp();
    }
    
    console.log('✅ Connection health check completed');
}

// Create video element for participant
function createVideoElement(participantId, stream, isLocal = false) {
    console.log(`Creating video element for ${participantId}, isLocal: ${isLocal}, stream:`, stream);
    
    const videoWrapper = document.createElement('div');
    videoWrapper.className = 'video-container loading entering';
    videoWrapper.id = `video-wrapper-${participantId}`;
    
    // Remove entering class after animation
    setTimeout(() => {
        videoWrapper.classList.remove('entering');
    }, 400);
    
    // Add accessibility attributes
    videoWrapper.setAttribute('role', 'gridcell');
    videoWrapper.setAttribute('tabindex', '0');
    videoWrapper.setAttribute('aria-label', isLocal ? 'Your video' : `Video of participant ${participantId.substring(0, 6)}`);

    const video = document.createElement('video');
    video.autoplay = true;
    video.playsInline = true;
    video.muted = isLocal; // Mute local video to prevent feedback
    video.setAttribute('aria-label', isLocal ? 'Your video stream' : `Video stream of participant ${participantId.substring(0, 6)}`);
    video.setAttribute('role', 'img');
    
    // Handle video loading states
    video.addEventListener('loadstart', () => {
        console.log(`Video loadstart for ${participantId}`);
        videoWrapper.classList.add('loading');
        videoWrapper.classList.remove('loaded');
    });
    
    video.addEventListener('loadeddata', () => {
        console.log(`Video loaded data for ${participantId}`);
        videoWrapper.classList.remove('loading');
        videoWrapper.classList.add('loaded');
    });
    
    video.addEventListener('canplay', () => {
        console.log(`Video can play for ${participantId}`);
        videoWrapper.classList.remove('loading');
        videoWrapper.classList.add('loaded');
    });
    
    video.addEventListener('error', (e) => {
        console.error(`Video error for ${participantId}:`, e);
        videoWrapper.classList.remove('loading');
        videoWrapper.classList.add('no-video');
    });
    
    // Set stream after event listeners are attached
    if (stream && stream.getTracks().length > 0) {
        console.log(`🎬 Setting stream for ${participantId}`);
        console.log(`📊 Stream tracks: ${stream.getTracks().map(t => `${t.kind}:${t.enabled}`).join(', ')}`);
        
        video.srcObject = stream;
        
        // Verify stream is active
        const activeTracks = stream.getTracks().filter(t => t.readyState === 'live');
        if (activeTracks.length === 0) {
            console.warn(`⚠️ All tracks inactive for ${participantId}`);
        } else {
            console.log(`✅ ${activeTracks.length} active tracks for ${participantId}`);
        }
        
        // Try to play the video immediately for remote streams
        if (!isLocal) {
            video.play().catch(e => {
                console.log(`⚠️ Auto-play failed for ${participantId}: ${e.message}`);
            });
        }
        
        // Timeout fallback to remove loading state if video doesn't load
        setTimeout(() => {
            if (videoWrapper.classList.contains('loading')) {
                console.warn(`⏰ Video loading timeout for ${participantId}`);
                console.log(`📊 Video state: ${video.readyState}, dimensions: ${video.videoWidth}x${video.videoHeight}`);
                
                if (video.videoWidth > 0) {
                    // Video has dimensions but still loading - probably just slow
                    videoWrapper.classList.remove('loading');
                    videoWrapper.classList.add('loaded');
                } else {
                    // No dimensions - likely a problem
                    videoWrapper.classList.remove('loading');
                    videoWrapper.classList.add('no-video');
                }
            }
        }, 5000);
    } else {
        console.warn(`❌ No valid stream provided for ${participantId}`);
        videoWrapper.classList.remove('loading');
        videoWrapper.classList.add('no-video');
    }

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
        console.log(`🔗 Setting up peer connection with ${peerId}, isInitiator: ${isInitiator}`);
        
        // Clean up any existing connection for this peer first
        if (peerConnections[peerId]) {
            console.log(`🧹 Cleaning up existing connection for ${peerId}`);
            peerConnections[peerId].close();
            delete peerConnections[peerId];
        }
        
        // Also clean up video element if it exists
        if (videoElements[peerId]) {
            console.log(`🧹 Cleaning up existing video element for ${peerId}`);
            videoElements[peerId].wrapper.remove();
            delete videoElements[peerId];
        }
        
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
        console.log(`✅ Created peer connection for ${peerId}`);

        // Add local stream tracks
        if (localStream && localStream.getTracks().length > 0) {
            console.log(`Adding ${localStream.getTracks().length} tracks to peer connection with ${peerId}`);
            localStream.getTracks().forEach((track, index) => {
                console.log(`Adding track ${index}: ${track.kind} - ${track.label} - enabled: ${track.enabled}`);
                const sender = pc.addTrack(track, localStream);
                console.log(`Added track sender:`, sender);
            });
        } else {
            console.error('No local stream available when setting up peer connection');
            // Try to get media again if not available
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                localStream = stream;
                stream.getTracks().forEach((track, index) => {
                    console.log(`Adding fallback track ${index}: ${track.kind} - ${track.label}`);
                    pc.addTrack(track, stream);
                });
            } catch (error) {
                console.error('Failed to get media for peer connection:', error);
            }
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
            console.log(`🎥 ONTRACK EVENT for ${peerId}`);
            console.log(`📺 Stream ID: ${event.streams[0].id}`);
            console.log(`🎵 Stream tracks: ${event.streams[0].getTracks().length}`);
            
            const remoteStream = event.streams[0];
            
            event.streams[0].getTracks().forEach((track, index) => {
                console.log(`🎬 Track ${index}: ${track.kind} - enabled: ${track.enabled} - readyState: ${track.readyState}`);
            });
            
            // Add participant to list if not already there
            if (!participants.has(peerId)) {
                console.log(`➕ Adding ${peerId} to participants list`);
                participants.add(peerId);
            }
            
            // Force cleanup of any existing video element first
            if (videoElements[peerId]) {
                console.log(`🧹 Cleaning up existing video element for ${peerId}`);
                const oldWrapper = videoElements[peerId].wrapper;
                if (oldWrapper.parentNode) {
                    oldWrapper.remove();
                }
                delete videoElements[peerId];
            }
            
            // Always create a fresh video element
            console.log(`🆕 Creating fresh video element for remote peer ${peerId}`);
            createVideoElement(peerId, remoteStream, false);
            
            // Verify stream assignment immediately
            setTimeout(() => {
                const videoEl = videoElements[peerId]?.video;
                if (videoEl) {
                    if (videoEl.srcObject) {
                        console.log(`✅ Stream successfully assigned to ${peerId}`);
                        console.log(`📊 Video dimensions: ${videoEl.videoWidth}x${videoEl.videoHeight}`);
                        console.log(`▶️ Video ready state: ${videoEl.readyState}`);
                        
                        // Force a play attempt
                        videoEl.play().catch(e => {
                            console.log(`⚠️ Play failed for ${peerId}:`, e.message);
                        });
                    } else {
                        console.error(`❌ Stream NOT assigned to ${peerId} - retrying...`);
                        videoEl.srcObject = remoteStream;
                    }
                } else {
                    console.error(`❌ Video element not found for ${peerId}`);
                }
                updateVideoGrid();
            }, 100);
            
            // Secondary verification after 2 seconds
            setTimeout(() => {
                const videoEl = videoElements[peerId]?.video;
                if (videoEl && videoEl.srcObject) {
                    if (videoEl.videoWidth === 0) {
                        console.warn(`⚠️ Video element for ${peerId} has no dimensions - stream might be inactive`);
                        // Try to refresh the stream
                        videoEl.srcObject = null;
                        setTimeout(() => {
                            videoEl.srcObject = remoteStream;
                        }, 100);
                    } else {
                        console.log(`✅ Video fully loaded for ${peerId}: ${videoEl.videoWidth}x${videoEl.videoHeight}`);
                    }
                } else {
                    console.error(`❌ Video element or stream missing for ${peerId} after 2 seconds`);
                }
            }, 2000);
        };

        // Handle connection state changes
        pc.onconnectionstatechange = () => {
            console.log(`🔗 Connection state with ${peerId}: ${pc.connectionState}`);
            
            if (pc.connectionState === 'connected') {
                console.log(`✅ Successfully connected to peer ${peerId}`);
                // Update connection status
                const connectedPeers = Object.keys(peerConnections).filter(p => 
                    peerConnections[p].connectionState === 'connected'
                ).length;
                updateConnectionStatus('connected', `Connected to ${connectedPeers} peer${connectedPeers !== 1 ? 's' : ''}`);
                
            } else if (pc.connectionState === 'failed') {
                console.log(`❌ Connection to ${peerId} failed - attempting retry`);
                
                // Retry connection after a short delay
                setTimeout(async () => {
                    if (participants.has(peerId) && !peerConnections[peerId]) {
                        console.log(`🔄 Retrying connection to ${peerId}`);
                        try {
                            await setupPeerConnection(peerId, true);
                        } catch (error) {
                            console.error(`❌ Retry failed for ${peerId}:`, error);
                        }
                    }
                }, 2000);
                
                // Clean up failed connection
                handlePeerDisconnection(peerId);
                
            } else if (pc.connectionState === 'disconnected') {
                console.log(`🔌 Peer ${peerId} disconnected`);
                // Give some time for reconnection before cleanup
                setTimeout(() => {
                    if (pc.connectionState === 'disconnected') {
                        console.log(`🚪 Cleaning up disconnected peer ${peerId}`);
                        handlePeerDisconnection(peerId);
                    }
                }, 5000);
            }
        };

        // Handle ICE connection state changes
        pc.oniceconnectionstatechange = () => {
            console.log(`🧊 ICE connection state with ${peerId}: ${pc.iceConnectionState}`);
            
            if (pc.iceConnectionState === 'failed') {
                console.log(`❄️ ICE connection to ${peerId} failed`);
                // ICE restart might help
                pc.restartIce();
            } else if (pc.iceConnectionState === 'disconnected') {
                console.log(`❄️ ICE disconnected from ${peerId}`);
            }
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
    console.log(`🚪 Handling disconnection for peer: ${peerId}`);
    
    if (peerConnections[peerId]) {
        console.log(`🔌 Closing peer connection for ${peerId}`);
        peerConnections[peerId].close();
        delete peerConnections[peerId];
    }
    
    if (videoElements[peerId]) {
        console.log(`🗑️ Removing video element for ${peerId}`);
        videoElements[peerId].wrapper.remove();
        delete videoElements[peerId];
    }
    
    participants.delete(peerId);
    console.log(`👥 Participants after removal: ${Array.from(participants)}`);
    updateVideoGrid();
}

// Calculate optimal grid layout based on participant count and screen dimensions
function calculateOptimalLayout(participantCount, containerWidth, containerHeight) {
    if (participantCount === 0) return { cols: 1, rows: 1 };
    if (participantCount === 1) return { cols: 1, rows: 1 };
    
    const aspectRatio = containerWidth / containerHeight;
    const isMobile = window.innerWidth <= 768;
    const isSmallMobile = window.innerWidth <= 480;
    const isLandscape = window.innerWidth > window.innerHeight;
    
    let cols, rows;
    
    if (isSmallMobile && !isLandscape) {
        // Small mobile: prioritize vertical stacking for better visibility
        if (participantCount <= 2) {
            cols = 1; rows = participantCount;
        } else if (participantCount <= 4) {
            cols = 2; rows = Math.ceil(participantCount / 2);
        } else {
            cols = 2; rows = Math.ceil(participantCount / 2);
        }
    } else if (isMobile) {
        // Regular mobile: balanced approach
        if (participantCount <= 2) {
            cols = isLandscape ? 2 : 1;
            rows = isLandscape ? 1 : participantCount;
        } else if (participantCount <= 4) {
            cols = 2; rows = Math.ceil(participantCount / 2);
        } else if (participantCount <= 6) {
            cols = isLandscape ? 3 : 2; 
            rows = Math.ceil(participantCount / cols);
        } else {
            cols = isLandscape ? 3 : 2; 
            rows = Math.ceil(participantCount / cols);
        }
    } else {
        // Desktop: optimize for screen real estate
        if (participantCount <= 2) {
            cols = 2; rows = 1;
        } else if (participantCount <= 4) {
            cols = 2; rows = 2;
        } else if (participantCount <= 6) {
            cols = 3; rows = 2;
        } else if (participantCount <= 9) {
            cols = 3; rows = 3;
        } else if (participantCount <= 12) {
            cols = 4; rows = 3;
        } else if (participantCount <= 16) {
            cols = 4; rows = 4;
        } else {
            // For more than 16 participants, create a scrollable grid
            cols = 5; rows = Math.ceil(participantCount / 5);
        }
    }
    
    return { cols, rows };
}

// Calculate tile dimensions based on layout
function calculateTileDimensions(layout, containerWidth, containerHeight, gap) {
    const { cols, rows } = layout;
    
    const totalGapWidth = gap * (cols - 1);
    const totalGapHeight = gap * (rows - 1);
    
    const availableWidth = containerWidth - totalGapWidth;
    const availableHeight = containerHeight - totalGapHeight;
    
    let tileWidth = availableWidth / cols;
    let tileHeight = availableHeight / rows;
    
    // Maintain reasonable aspect ratio (prefer 16:9 or 4:3)
    const targetAspectRatio = window.innerWidth <= 768 ? 4/3 : 16/9;
    
    if (tileWidth / tileHeight > targetAspectRatio * 1.5) {
        // Too wide, constrain width
        tileWidth = tileHeight * targetAspectRatio;
    } else if (tileHeight / tileWidth > (1/targetAspectRatio) * 1.5) {
        // Too tall, constrain height
        tileHeight = tileWidth / targetAspectRatio;
    }
    
    // Ensure minimum and maximum sizes
    const minTileSize = window.innerWidth <= 480 ? 120 : window.innerWidth <= 768 ? 150 : 180;
    const maxTileSize = window.innerWidth <= 768 ? 300 : 400;
    
    tileWidth = Math.max(minTileSize, Math.min(maxTileSize, tileWidth));
    tileHeight = Math.max(minTileSize * 0.75, Math.min(maxTileSize * 0.75, tileHeight));
    
    return { width: tileWidth, height: tileHeight };
}

// Update video grid layout based on participant count
function updateVideoGrid() {
    const participantCount = participants.size;
    
    if (participantCount === 0) return;
    
    console.log(`Updating video grid layout for ${participantCount} participants`);
    
    // Get container dimensions
    const containerRect = videoContainer.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;
    
    if (containerWidth === 0 || containerHeight === 0) {
        // Container not ready, try again later
        setTimeout(updateVideoGrid, 100);
        return;
    }
    
    // Calculate optimal layout
    const layout = calculateOptimalLayout(participantCount, containerWidth, containerHeight);
    console.log(`Calculated layout: ${layout.cols}x${layout.rows} for ${participantCount} participants`);
    
    // Get gap size
    const computedStyle = getComputedStyle(videoContainer);
    const gap = parseInt(computedStyle.gap) || 8;
    
    // Calculate tile dimensions
    const tileDimensions = calculateTileDimensions(layout, containerWidth, containerHeight, gap);
    console.log(`Tile dimensions: ${tileDimensions.width}x${tileDimensions.height}`);
    
    // Apply grid layout
    videoContainer.style.gridTemplateColumns = `repeat(${layout.cols}, ${tileDimensions.width}px)`;
    videoContainer.style.gridTemplateRows = `repeat(${layout.rows}, ${tileDimensions.height}px)`;
    
    // Update all video containers
    Object.values(videoElements).forEach(({ wrapper }) => {
        wrapper.style.width = `${tileDimensions.width}px`;
        wrapper.style.height = `${tileDimensions.height}px`;
        wrapper.style.minWidth = `${tileDimensions.width}px`;
        wrapper.style.minHeight = `${tileDimensions.height}px`;
    });
    
    // Add accessibility attributes
    videoContainer.setAttribute('aria-label', `Video call with ${participantCount} participant${participantCount !== 1 ? 's' : ''}`);
    videoContainer.setAttribute('role', 'grid');
    
    // Check screen size adequacy
    checkScreenSizeAdequacy();
    
    console.log(`Applied grid layout: ${layout.cols}x${layout.rows}`);
    
    // Trigger layout preview in debug mode (uncomment for testing)
    // previewLayoutForBreakpoints();
}

// Setup control button listeners
function setupControlListeners() {
    videoBtn.addEventListener('click', toggleVideo);
    audioBtn.addEventListener('click', toggleAudio);
    leaveBtn.addEventListener('click', leaveCall);
    
    // Add window resize listener for responsive layout
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            console.log('Window resized, updating grid layout');
            updateVideoGrid();
        }, 150);
    });
    
    // Add orientation change listener for mobile
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            console.log('Orientation changed, updating grid layout');
            updateVideoGrid();
        }, 300);
    });
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
function updateConnectionStatus(status, message) {
    connectionStatus.className = `connection-status ${status}`;
    
    switch (status) {
        case 'connected':
            connectionStatus.textContent = message || 'Connected';
            break;
        case 'connecting':
            connectionStatus.textContent = message || 'Connecting...';
            break;
        case 'reconnecting':
            connectionStatus.textContent = message || 'Reconnecting...';
            connectionStatus.className = 'connection-status connecting';
            break;
        case 'loading-participants':
            connectionStatus.textContent = message || 'Loading participants...';
            connectionStatus.className = 'connection-status connecting';
            break;
        case 'disconnected':
            connectionStatus.textContent = message || 'Disconnected';
            break;
    }
}

// Debug function to log application state
function logApplicationState() {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`=== APPLICATION STATE [${timestamp}] ===`);
    console.log('🆔 User ID:', userId);
    console.log('📹 Local stream:', localStream);
    console.log('🎵 Local stream tracks:', localStream ? localStream.getTracks().map(t => `${t.kind}: ${t.enabled}`) : 'None');
    console.log('👥 Participants:', Array.from(participants));
    console.log('🔗 Peer connections:', Object.keys(peerConnections));
    console.log('🎥 Video elements:', Object.keys(videoElements));
    console.log('🌐 WebSocket state:', getWebSocketStateString());
    console.log('📱 Screen dimensions:', `${window.innerWidth}x${window.innerHeight}`);
    console.log('📦 Container dimensions:', videoContainer ? `${videoContainer.getBoundingClientRect().width}x${videoContainer.getBoundingClientRect().height}` : 'N/A');
    
    // Log connection states
    Object.keys(peerConnections).forEach(peerId => {
        const pc = peerConnections[peerId];
        console.log(`🔗 ${peerId}: ${pc.connectionState} (ICE: ${pc.iceConnectionState}, Signaling: ${pc.signalingState})`);
    });
    
    console.log('=======================================');
}

// Get human-readable WebSocket state
function getWebSocketStateString() {
    switch (signalingServer.readyState) {
        case WebSocket.CONNECTING: return 'CONNECTING';
        case WebSocket.OPEN: return 'OPEN';
        case WebSocket.CLOSING: return 'CLOSING';
        case WebSocket.CLOSED: return 'CLOSED';
        default: return 'UNKNOWN';
    }
}

// Manual refresh function for debugging
function refreshParticipants() {
    console.log('🔄 Manual refresh requested by user');
    
    // Re-register with server to get fresh participant list
    if (signalingServer.readyState === WebSocket.OPEN) {
        console.log('📡 Re-registering with server...');
        signalingServer.send(JSON.stringify({ 
            type: 'register', 
            id: userId,
            timestamp: Date.now(),
            isRefresh: true
        }));
    } else {
        console.log('❌ WebSocket not connected, reloading page...');
        window.location.reload();
    }
}

// Verify and fix video streams
function verifyVideoStreams() {
    console.log('🔍 Verifying video streams...');
    
    Object.keys(videoElements).forEach(peerId => {
        const videoEl = videoElements[peerId].video;
        const wrapper = videoElements[peerId].wrapper;
        
        console.log(`📹 Checking ${peerId}:`);
        console.log(`  - Has srcObject: ${!!videoEl.srcObject}`);
        console.log(`  - Video dimensions: ${videoEl.videoWidth}x${videoEl.videoHeight}`);
        console.log(`  - Ready state: ${videoEl.readyState}`);
        console.log(`  - Paused: ${videoEl.paused}`);
        console.log(`  - Current time: ${videoEl.currentTime}`);
        
        if (videoEl.srcObject) {
            const tracks = videoEl.srcObject.getTracks();
            console.log(`  - Stream tracks: ${tracks.length}`);
            tracks.forEach((track, i) => {
                console.log(`    Track ${i}: ${track.kind} - ${track.readyState} - enabled: ${track.enabled}`);
            });
            
            // Try to fix streams that aren't displaying
            if (videoEl.videoWidth === 0 && tracks.some(t => t.kind === 'video' && t.readyState === 'live')) {
                console.log(`🔧 Attempting to fix stream for ${peerId}`);
                
                // Force refresh the stream
                const currentStream = videoEl.srcObject;
                videoEl.srcObject = null;
                setTimeout(() => {
                    videoEl.srcObject = currentStream;
                    videoEl.play().catch(e => console.log(`Play failed: ${e.message}`));
                }, 100);
                
                // Update loading state
                wrapper.classList.add('loading');
                wrapper.classList.remove('loaded', 'no-video');
                
                // Check again after refresh
                setTimeout(() => {
                    if (videoEl.videoWidth > 0) {
                        console.log(`✅ Fixed stream for ${peerId}`);
                        wrapper.classList.remove('loading');
                        wrapper.classList.add('loaded');
                    } else {
                        console.log(`❌ Could not fix stream for ${peerId}`);
                        wrapper.classList.remove('loading');
                        wrapper.classList.add('no-video');
                    }
                }, 2000);
            }
        } else {
            console.log(`❌ No stream for ${peerId}`);
        }
    });
}

// Force reconnect to all peers
function forceReconnectAll() {
    console.log('🔄 Force reconnecting to all peers...');
    
    const peersToReconnect = Array.from(participants).filter(p => p !== userId);
    
    console.log(`🔗 Reconnecting to: ${peersToReconnect.join(', ')}`);
    
    // Close all existing connections
    Object.keys(peerConnections).forEach(peerId => {
        console.log(`🔌 Closing connection to ${peerId}`);
        peerConnections[peerId].close();
        delete peerConnections[peerId];
    });
    
    // Remove all video elements except local
    Object.keys(videoElements).forEach(peerId => {
        if (peerId !== userId) {
            console.log(`🗑️ Removing video element for ${peerId}`);
            videoElements[peerId].wrapper.remove();
            delete videoElements[peerId];
        }
    });
    
    // Clear participants except self
    participants.clear();
    participants.add(userId);
    
    // Re-register to get fresh connections
    refreshParticipants();
}

// Layout preview function for testing different breakpoints
function previewLayoutForBreakpoints() {
    if (!participants.size) return;
    
    const breakpoints = [
        { name: 'Small Mobile', width: 375, height: 667 },
        { name: 'Mobile', width: 768, height: 1024 },
        { name: 'Tablet', width: 1024, height: 768 },
        { name: 'Desktop', width: 1440, height: 900 },
        { name: 'Large Desktop', width: 1920, height: 1080 }
    ];
    
    console.log('=== LAYOUT PREVIEW ===');
    console.log(`Testing layouts for ${participants.size} participants:`);
    
    breakpoints.forEach(bp => {
        // Temporarily mock window dimensions
        const originalWidth = window.innerWidth;
        const originalHeight = window.innerHeight;
        
        Object.defineProperty(window, 'innerWidth', { value: bp.width, writable: true });
        Object.defineProperty(window, 'innerHeight', { value: bp.height, writable: true });
        
        const layout = calculateOptimalLayout(participants.size, bp.width * 0.9, bp.height * 0.7);
        const tileDims = calculateTileDimensions(layout, bp.width * 0.9, bp.height * 0.7, 8);
        
        console.log(`${bp.name} (${bp.width}x${bp.height}): ${layout.cols}x${layout.rows} grid, tiles: ${Math.round(tileDims.width)}x${Math.round(tileDims.height)}`);
        
        // Restore original values
        Object.defineProperty(window, 'innerWidth', { value: originalWidth, writable: true });
        Object.defineProperty(window, 'innerHeight', { value: originalHeight, writable: true });
    });
    console.log('=====================');
}

// Check if screen is too small and show notification
function checkScreenSizeAdequacy() {
    const participantCount = participants.size;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // Calculate minimum required dimensions
    const minTileSize = 100; // Absolute minimum for readability
    const layout = calculateOptimalLayout(participantCount, screenWidth, screenHeight);
    const requiredWidth = layout.cols * minTileSize + (layout.cols - 1) * 8;
    const requiredHeight = layout.rows * minTileSize + (layout.rows - 1) * 8;
    
    if (screenWidth < requiredWidth || screenHeight < requiredHeight) {
        showScreenSizeWarning(participantCount);
        return false;
    } else {
        hideScreenSizeWarning();
        return true;
    }
}

// Show screen size warning
function showScreenSizeWarning(participantCount) {
    let warning = document.getElementById('screen-size-warning');
    if (!warning) {
        warning = document.createElement('div');
        warning.id = 'screen-size-warning';
        warning.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            z-index: 1000;
            font-size: 14px;
            max-width: 300px;
            backdrop-filter: blur(10px);
        `;
        document.body.appendChild(warning);
    }
    
    warning.innerHTML = `
        <h3 style="margin: 0 0 10px 0;">Screen Too Small</h3>
        <p style="margin: 0 0 10px 0;">Your screen may be too small to comfortably display all ${participantCount} participants.</p>
        <p style="margin: 0; font-size: 12px; opacity: 0.8;">Try rotating your device or using a larger screen for the best experience.</p>
    `;
    
    setTimeout(() => {
        if (warning && warning.parentNode) {
            warning.parentNode.removeChild(warning);
        }
    }, 5000);
}

// Hide screen size warning
function hideScreenSizeWarning() {
    const warning = document.getElementById('screen-size-warning');
    if (warning && warning.parentNode) {
        warning.parentNode.removeChild(warning);
    }
}

// Show help overlay for refreshing participants
function showHelpOverlay() {
    const overlay = document.getElementById('helpOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
        console.log('ℹ️ Showing help overlay for participant refresh');
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (overlay.style.display === 'flex') {
                overlay.style.display = 'none';
            }
        }, 10000);
    }
}

// Initialize the application
initializeApp();

// Add debug logging every 10 seconds
setInterval(logApplicationState, 10000);

// Expose debug functions globally for testing
window.videoCallDebug = {
    logState: logApplicationState,
    previewLayouts: previewLayoutForBreakpoints,
    updateGrid: updateVideoGrid,
    refreshParticipants: refreshParticipants,
    verifyStreams: verifyVideoStreams,
    forceReconnectAll: forceReconnectAll,
    participants: () => Array.from(participants),
    videoElements: () => Object.keys(videoElements),
    connections: () => Object.keys(peerConnections).map(peerId => ({
        peerId,
        connectionState: peerConnections[peerId].connectionState,
        iceConnectionState: peerConnections[peerId].iceConnectionState,
        signalingState: peerConnections[peerId].signalingState
    })),
    // Quick fixes
    fixStreams: () => {
        console.log('🔧 Running quick stream fixes...');
        verifyVideoStreams();
        setTimeout(updateVideoGrid, 1000);
    },
    hardReset: () => {
        console.log('💥 Performing hard reset...');
        forceReconnectAll();
    }
};

// Add double-tap listener for mobile refresh
let lastTap = 0;
document.addEventListener('touchend', (e) => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    if (tapLength < 500 && tapLength > 0) {
        console.log('📱 Double tap detected - refreshing participants');
        refreshParticipants();
        e.preventDefault();
    }
    lastTap = currentTime;
});

// Add keyboard shortcut for refresh (Ctrl+R or Cmd+R won't work, so use Ctrl+Shift+R)
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        console.log('⌨️ Keyboard shortcut detected - refreshing participants');
        refreshParticipants();
    }
});

// Handle page visibility changes (useful for detecting when user returns after reload)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && signalingServer.readyState === WebSocket.OPEN) {
        console.log('👁️ Page became visible - checking connections');
        
        // Give a moment for everything to settle, then check connections
        setTimeout(() => {
            const connectedPeers = Object.keys(peerConnections).filter(peerId => 
                peerConnections[peerId].connectionState === 'connected'
            );
            
            const participantCount = participants.size - 1; // Exclude self
            
            if (participantCount > 0 && connectedPeers.length < participantCount) {
                console.log(`⚠️ Expected ${participantCount} connections but only have ${connectedPeers.length} - refreshing`);
                refreshParticipants();
            }
        }, 2000);
    }
});

// Handle before page unload to clean up connections
window.addEventListener('beforeunload', () => {
    console.log('🚪 Page unloading - cleaning up connections');
    
    // Close all peer connections
    Object.values(peerConnections).forEach(pc => {
        try {
            pc.close();
        } catch (e) {
            console.log('Error closing connection:', e);
        }
    });
    
    // Stop local stream
    if (localStream) {
        localStream.getTracks().forEach(track => {
            try {
                track.stop();
            } catch (e) {
                console.log('Error stopping track:', e);
            }
        });
    }
});
