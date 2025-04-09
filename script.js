const localVideo = document.getElementById('localVideo');
const signalingServer = new WebSocket('wss://live-cam.onrender.com'); // Update with your signaling server URL
const peerConnections = {}; // Store peer connections
const videoElements = {}; // Store video elements for remote streams
const userId = Math.random().toString(36).substring(7);

signalingServer.onmessage = async (message) => {
    const data = JSON.parse(message.data);

    if (data.type === 'existing-participants') {
        // Connect to all existing participants
        for (const peerId of data.participants) {
            setupPeerConnection(peerId, true);
        }
    } else if (data.type === 'new-peer') {
        // Connect to the new participant
        const peerId = data.id;
        if (!peerConnections[peerId]) {
            setupPeerConnection(peerId, true); // Initiate connection with the new peer
        }
    } else if (data.type === 'signal' && data.signal) {
        const peerId = data.sender;

        if (!peerConnections[peerId]) {
            setupPeerConnection(peerId, false);
        }

        const peerConnection = peerConnections[peerId];
        if (data.signal.type === 'offer') {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.signal));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            signalingServer.send(JSON.stringify({ type: 'signal', target: peerId, signal: answer, sender: userId }));
        } else if (data.signal.type === 'answer') {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.signal));
        } else if (data.signal.candidate) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.signal));
        }
    } else if (data.type === 'peer-disconnected') {
        const peerId = data.id;
        if (peerConnections[peerId]) {
            peerConnections[peerId].close();
            delete peerConnections[peerId];
        }
        const videoElement = videoElements[peerId];
        if (videoElement && document.contains(videoElement)) {
            videoElement.remove();
            delete videoElements[peerId];
        }
        
        
    }

    // Ensure only one local video element exists
    if (localVideo && localVideo.srcObject && videoElements[userId]) {
        videoElements[userId].remove();
        delete videoElements[userId];
    }
    
};

async function setupPeerConnection(peerId, isInitiator) {
    const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    peerConnections[peerId] = peerConnection;

    // Handle ICE candidates
    peerConnection.onicecandidate = ({ candidate }) => {
        if (candidate && peerConnections[peerId]) {
            signalingServer.send(JSON.stringify({ type: 'signal', target: peerId, signal: candidate, sender: userId }));
        }        
    };    

    // Handle remote stream
    peerConnection.ontrack = (event) => {
        if (!videoElements[peerId]) {
            const video = document.createElement('video');
            video.autoplay = true;
            video.controls = false;
            video.style.width = '200px';
            video.style.margin = '10px';
            videoElements[peerId] = video;
            document.body.appendChild(video);
        }
        videoElements[peerId].srcObject = event.streams[0];
    };

    // Add local stream to the peer connection
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));
    // If the initiator, create an offer
    if (isInitiator) {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        signalingServer.send(JSON.stringify({ type: 'signal', target: peerId, signal: offer, sender: userId }));
    }

    // Attach local stream to local video element (only done once)
    if (!localVideo.srcObject) {
        localVideo.srcObject = stream;
    }
}

// Register the user with the signaling server
signalingServer.onopen = () => {
    signalingServer.send(JSON.stringify({ type: 'register', id: userId }));
};
