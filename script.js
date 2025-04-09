const localVideo = document.getElementById('localVideo');
const videoContainer = document.getElementById('videoContainer');
const signalingServer = new WebSocket('http://localhost:3000'); // Use your deployed signaling server
const peerConnections = {};
const videoElements = {};
const userId = Math.random().toString(36).substring(7);

signalingServer.onmessage = async (message) => {
  const data = JSON.parse(message.data);

  if (data.type === 'existing-participants') {
    for (const peerId of data.participants) {
      setupPeerConnection(peerId, true);
    }
  } else if (data.type === 'new-peer') {
    const peerId = data.id;
    if ( !peerConnections[peerId]) {
      setupPeerConnection(peerId, true);
    }
  } else if (data.type === 'signal') {
    const peerId = data.sender;
    if (!peerConnections[peerId]) {
      await setupPeerConnection(peerId, false);
    }

    const pc = peerConnections[peerId];

    if (data.signal.type === 'offer') {
      await pc.setRemoteDescription(new RTCSessionDescription(data.signal));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      signalingServer.send(JSON.stringify({ type: 'signal', target: peerId, signal: answer, sender: userId }));
    } else if (data.signal.type === 'answer') {
      await pc.setRemoteDescription(new RTCSessionDescription(data.signal));
    } else if (data.signal.candidate) {
      await pc.addIceCandidate(new RTCIceCandidate(data.signal));
    }
  } else if (data.type === 'peer-disconnected') {
    const peerId = data.id;
    if (peerConnections[peerId]) {
      peerConnections[peerId].close();
      delete peerConnections[peerId];
    }
    const video = videoElements[peerId];
    if (video && document.body.contains(video)) {
      video.remove();
      delete videoElements[peerId];
    }
  }
};

async function setupPeerConnection(peerId, isInitiator) {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });

  peerConnections[peerId] = pc;

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      signalingServer.send(JSON.stringify({ type: 'signal', target: peerId, signal: event.candidate, sender: userId }));
    }
  };

  pc.ontrack = (event) => {
    if (!videoElements[peerId]) {
      const video = document.createElement('video');
      video.autoplay = true;
      video.style.width = '200px';
      video.style.height = '200px';
      videoElements[peerId] = video;
      video.srcObject = event.streams[0];
      videoContainer.appendChild(video);
    }
  };

  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  stream.getTracks().forEach(track => pc.addTrack(track, stream));

  if (!localVideo.srcObject) {
    localVideo.srcObject = stream;
  }

  if (isInitiator) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    signalingServer.send(JSON.stringify({ type: 'signal', target: peerId, signal: offer, sender: userId }));
  }
}

signalingServer.onopen = () => {
  signalingServer.send(JSON.stringify({ type: 'register', id: userId }));
};
