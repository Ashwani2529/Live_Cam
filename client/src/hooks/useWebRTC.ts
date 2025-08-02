import { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Participant,
  ConnectionStatus,
  UseWebRTCReturn,
  WebRTCConfig
} from '../types/webrtc';

const WEBRTC_CONFIG: WebRTCConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' }
  ]
};

const getWebSocketUrl = () => {
  const host = window.location.host;
  
  // For development, use localhost:5000
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return 'ws://localhost:5000';
  }
  
  // For production, use your Render backend server URL
  return 'wss://live-cam.onrender.com';
};

export const useWebRTC = (roomId: string = 'default-room'): UseWebRTCReturn => {
  // State management
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'connecting',
    message: 'Initializing...'
  });
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  // Refs for persistent data
  const wsRef = useRef<WebSocket | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const userIdRef = useRef<string>(uuidv4());
  const currentRoomRef = useRef<string>(roomId);

  // Initialize media stream
  const initializeMediaStream = useCallback(async () => {
    // Prevent multiple initializations
    if (localStream) {
      console.log('⚠️ Media stream already exists, skipping initialization');
      return localStream;
    }
    
    try {
      console.log('🚀 Initializing media stream...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
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

      setLocalStream(stream);
      
      // Add local participant
      const localParticipant: Participant = {
        id: userIdRef.current,
        stream,
        isLocal: true,
        mediaState: { video: true, audio: true },
        connectionState: 'connected'
      };

      setParticipants(prev => new Map(prev.set(userIdRef.current, localParticipant)));
      
      console.log('✅ Media stream initialized:', stream.getTracks().length, 'tracks');
      return stream;
    } catch (error) {
      console.error('❌ Failed to get media stream:', error);
      setConnectionStatus({
        status: 'disconnected',
        message: 'Failed to access camera/microphone'
      });
      throw error;
    }
  }, []);

  // Setup peer connection
  const setupPeerConnection = useCallback(async (peerId: string, isInitiator: boolean): Promise<RTCPeerConnection> => {
    console.log(`🔗 Setting up peer connection with ${peerId}, isInitiator: ${isInitiator}`);

    // Clean up existing connection
    const existingPc = peerConnectionsRef.current.get(peerId);
    if (existingPc) {
      existingPc.close();
      peerConnectionsRef.current.delete(peerId);
    }

    const pc = new RTCPeerConnection(WEBRTC_CONFIG);
    peerConnectionsRef.current.set(peerId, pc);

    // Add local stream tracks
    if (localStream) {
      console.log(`📤 Adding ${localStream.getTracks().length} local tracks to connection with ${peerId}`);
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    } else {
      console.warn(`⚠️ No local stream available when setting up connection with ${peerId}`);
    }

    // Handle incoming streams
    pc.ontrack = (event) => {
      console.log(`🎥 Received remote stream from ${peerId}:`, event);
      const remoteStream = event.streams[0];
      
      if (!remoteStream) {
        console.error(`❌ No remote stream in ontrack event from ${peerId}`);
        return;
      }
      
      const tracks = remoteStream.getTracks();
      console.log(`📺 Remote stream has ${tracks.length} tracks:`, tracks.map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState })));
      
      setParticipants(prev => {
        const newParticipants = new Map(prev);
        const participant = newParticipants.get(peerId);
        
        if (participant) {
          console.log(`🔄 Updating existing participant ${peerId} with stream`);
          newParticipants.set(peerId, {
            ...participant,
            stream: remoteStream,
            connectionState: 'connected'
          });
        } else {
          console.log(`➕ Creating new participant ${peerId} with stream`);
          newParticipants.set(peerId, {
            id: peerId,
            stream: remoteStream,
            isLocal: false,
            mediaState: { video: true, audio: true },
            connectionState: 'connected'
          });
        }
        
        return newParticipants;
      });
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`🔗 Connection state with ${peerId}: ${pc.connectionState}`);
      
      setParticipants(prev => {
        const newParticipants = new Map(prev);
        const participant = newParticipants.get(peerId);
        
        if (participant) {
          newParticipants.set(peerId, {
            ...participant,
            connectionState: pc.connectionState
          });
        }
        
        return newParticipants;
      });

      if (pc.connectionState === 'failed') {
        console.log(`❌ Connection to ${peerId} failed - will retry`);
        setTimeout(() => {
          if (participants.has(peerId)) {
            setupPeerConnection(peerId, true);
          }
        }, 2000);
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'signal',
          target: peerId,
          signal: event.candidate,
          sender: userIdRef.current
        }));
      }
    };

    // Create offer if initiator and we have the smaller ID (to prevent race conditions)
    if (isInitiator && userIdRef.current < peerId) {
      // Small delay to ensure peer connection is fully set up
      setTimeout(async () => {
        try {
          // Double-check that we still have the local stream
          if (!localStream) {
            console.error(`❌ No local stream available when creating offer for ${peerId}`);
            return;
          }
          
          console.log(`🎯 Creating offer for ${peerId} (our ID: ${userIdRef.current} < ${peerId})`);
          console.log(`📊 Peer connection state: ${pc.connectionState}, signaling: ${pc.signalingState}`);
          
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
          });
          await pc.setLocalDescription(offer);
          
          console.log(`📤 Sending offer to ${peerId}:`, offer);
          
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'signal',
              target: peerId,
              signal: offer,
              sender: userIdRef.current
            }));
          } else {
            console.error(`❌ WebSocket not ready when sending offer to ${peerId}`);
          }
        } catch (error) {
          console.error(`❌ Error creating offer for ${peerId}:`, error);
        }
      }, 500); // Increased delay to ensure everything is ready
    } else if (isInitiator) {
      console.log(`⏳ Waiting for ${peerId} to create offer (our ID: ${userIdRef.current} >= ${peerId})`);
    }

    return pc;
  }, [localStream, participants]);

  // Handle signaling messages
  const handleSignalingMessage = useCallback(async (data: {
    signal: RTCSessionDescriptionInit | RTCIceCandidateInit;
    sender: string;
    target: string;
  }) => {
    const { signal, sender } = data;
    
    let pc = peerConnectionsRef.current.get(sender);
    if (!pc) {
      pc = await setupPeerConnection(sender, false);
    }

    try {
      if ('type' in signal) {
        // Handle SDP (offer/answer)
        if (signal.type === 'offer') {
          console.log(`📥 Received offer from ${sender}:`, signal);
          console.log(`📊 Current connection state: ${pc.connectionState}, signaling: ${pc.signalingState}`);
          
          // Check if we're already in a state that can't accept offers
          if (pc.signalingState === 'stable') {
            console.log(`✅ Setting remote description and creating answer for ${sender}`);
            await pc.setRemoteDescription(signal);
            
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            
            console.log(`📤 Sending answer to ${sender}:`, answer);
            
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({
                type: 'signal',
                target: sender,
                signal: answer,
                sender: userIdRef.current
              }));
            } else {
              console.error(`❌ WebSocket not ready when sending answer to ${sender}`);
            }
          } else {
            console.log(`⚠️ Ignoring offer from ${sender}, signaling state: ${pc.signalingState}`);
          }
        } else if (signal.type === 'answer') {
          console.log(`📥 Received answer from ${sender}:`, signal);
          console.log(`📊 Current connection state: ${pc.connectionState}, signaling: ${pc.signalingState}`);
          
          // Only set remote description if we're in the right state
          if (pc.signalingState === 'have-local-offer') {
            console.log(`✅ Setting remote description for answer from ${sender}`);
            await pc.setRemoteDescription(signal);
          } else {
            console.log(`⚠️ Ignoring answer from ${sender}, signaling state: ${pc.signalingState}`);
          }
        }
      } else if ('candidate' in signal) {
        // Handle ICE candidate
        console.log(`📥 Received ICE candidate from ${sender}`);
        await pc.addIceCandidate(signal);
      }
    } catch (error) {
      console.error(`❌ Error handling signaling from ${sender}:`, error);
      
      // If there's a state error, try to reset the connection
      if (error instanceof Error && error.name === 'InvalidStateError') {
        console.log(`🔄 Resetting connection with ${sender} due to state error`);
        const oldPc = peerConnectionsRef.current.get(sender);
        if (oldPc) {
          oldPc.close();
          peerConnectionsRef.current.delete(sender);
        }
        
        // Remove from participants
        setParticipants(prev => {
          const newParticipants = new Map(prev);
          newParticipants.delete(sender);
          return newParticipants;
        });
        
        // Try to reconnect after a delay
        setTimeout(async () => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            console.log(`🔄 Attempting to reconnect with ${sender}`);
            await setupPeerConnection(sender, true);
          }
        }, 2000);
      }
    }
  }, [setupPeerConnection]);

  // Initialize WebSocket connection
  const initializeWebSocket = useCallback(() => {
    // Prevent multiple connections
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      console.log('⚠️ WebSocket already exists, skipping initialization');
      return wsRef.current;
    }
    
    const wsUrl = getWebSocketUrl();
    console.log('🔌 Connecting to WebSocket:', wsUrl);
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('✅ WebSocket connected successfully!');
      console.log('🔗 WebSocket URL:', wsUrl);
      setConnectionStatus({
        status: 'connected',
        message: 'Connected to server'
      });

      // Register with server
      ws.send(JSON.stringify({
        type: 'register',
        id: userIdRef.current,
        roomId: currentRoomRef.current
      }));

      // Send periodic heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'heartbeat', id: userIdRef.current }));
        } else {
          clearInterval(heartbeat);
        }
      }, 30000); // Send heartbeat every 30 seconds

      // Store heartbeat interval for cleanup
      (ws as any).heartbeatInterval = heartbeat;
    };

        ws.onclose = (event) => {
      console.log('⚠️ WebSocket disconnected:', event.code, event.reason);
      setConnectionStatus({
        status: 'disconnected',
        message: `Disconnected: ${event.reason || 'Connection lost'}`
      });
      
      // Auto-reconnect after a delay if not a clean close
      if (event.code !== 1000 && event.code !== 1001) {
        setTimeout(() => {
          if (wsRef.current?.readyState === WebSocket.CLOSED) {
            console.log('🔄 Attempting to reconnect...');
            wsRef.current = null; // Clear the reference before reconnecting
            initializeWebSocket();
          }
        }, 1000); // Reduced to 1 second for faster reconnection
      }
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      setConnectionStatus({
        status: 'disconnected',
        message: 'Connection failed'
      });
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📡 Received WebSocket message:', data.type, data);

        switch (data.type) {
          case 'existing-participants':
            console.log('📡 Existing participants:', data.participants);
            
            if (data.participants && data.participants.length > 0) {
              console.log(`🔄 Connecting to ${data.participants.length} existing participants...`);
              setConnectionStatus({
                status: 'loading-participants',
                message: `Connecting to ${data.participants.length} participant${data.participants.length !== 1 ? 's' : ''}...`
              });
              
              for (const peerId of data.participants) {
                if (peerId !== userIdRef.current) {
                  console.log(`🔗 Setting up connection with ${peerId}`);
                  
                  // Add participant placeholder immediately
                  setParticipants(prev => {
                    const newParticipants = new Map(prev);
                    if (!newParticipants.has(peerId)) {
                      console.log(`➕ Adding participant placeholder for ${peerId}`);
                      newParticipants.set(peerId, {
                        id: peerId,
                        stream: undefined, // Will be updated when stream is received
                        isLocal: false,
                        mediaState: { video: true, audio: true },
                        connectionState: 'connecting'
                      });
                    }
                    return newParticipants;
                  });
                  
                  await setupPeerConnection(peerId, true);
                }
              }
            }
            break;

          case 'new-peer':
            console.log('🆕 New peer joined:', data.id);
            
            if (data.id !== userIdRef.current) {
              // Add participant placeholder immediately
              setParticipants(prev => {
                const newParticipants = new Map(prev);
                if (!newParticipants.has(data.id)) {
                  console.log(`➕ Adding participant placeholder for ${data.id}`);
                  newParticipants.set(data.id, {
                    id: data.id,
                    stream: undefined, // Will be updated when stream is received
                    isLocal: false,
                    mediaState: { video: true, audio: true },
                    connectionState: 'connecting'
                  });
                }
                return newParticipants;
              });
              
              await setupPeerConnection(data.id, true);
            }
            break;

          case 'peer-disconnected':
            console.log('🚪 Peer disconnected:', data.id);
            
            // Clean up peer connection
            const pc = peerConnectionsRef.current.get(data.id);
            if (pc) {
              pc.close();
              peerConnectionsRef.current.delete(data.id);
            }
            
            // Remove participant
            setParticipants(prev => {
              const newParticipants = new Map(prev);
              newParticipants.delete(data.id);
              return newParticipants;
            });
            break;

          case 'peer-reconnecting':
            console.log('🔄 Peer reconnecting:', data.peerId);
            
            // Clean up old connection
            const oldPc = peerConnectionsRef.current.get(data.peerId);
            if (oldPc) {
              oldPc.close();
              peerConnectionsRef.current.delete(data.peerId);
            }
            
            setParticipants(prev => {
              const newParticipants = new Map(prev);
              newParticipants.delete(data.peerId);
              return newParticipants;
            });
            break;

          case 'signal':
            await handleSignalingMessage(data);
            break;

          case 'media-state-changed':
            console.log('🎥 Media state changed:', data.peerId, data.mediaState);
            
            setParticipants(prev => {
              const newParticipants = new Map(prev);
              const participant = newParticipants.get(data.peerId);
              
              if (participant) {
                newParticipants.set(data.peerId, {
                  ...participant,
                  mediaState: data.mediaState
                });
              }
              
              return newParticipants;
            });
            break;

          case 'room-status':
            console.log('📢 Room status:', data.message);
            setConnectionStatus({
              status: 'connected',
              message: data.message,
              participantCount: data.participantCount
            });
            
            // If we're the first participant, keep checking for others
            if (data.participantCount === 1) {
              console.log('👤 First participant, waiting for others...');
            }
            break;

          case 'error':
            console.error('❌ Server error:', data.message);
            setConnectionStatus({
              status: 'disconnected',
              message: data.message
            });
            break;

          case 'heartbeat-ack':
            console.log('💓 Heartbeat acknowledged');
            break;

          default:
            console.warn('Unknown message type:', data.type);
        }
      } catch (error) {
        console.error('❌ Error processing WebSocket message:', error);
      }
    };

    return ws;
  }, [setupPeerConnection, handleSignalingMessage]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        const newVideoState = !isVideoEnabled;
        videoTrack.enabled = newVideoState;
        setIsVideoEnabled(newVideoState);

        // Update local participant
        setParticipants(prev => {
          const newParticipants = new Map(prev);
          const localParticipant = newParticipants.get(userIdRef.current);
          
          if (localParticipant) {
            newParticipants.set(userIdRef.current, {
              ...localParticipant,
              mediaState: { ...localParticipant.mediaState, video: newVideoState }
            });
          }
          
          return newParticipants;
        });

        // Broadcast media state change
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'media-state-changed',
            mediaState: { video: newVideoState, audio: isAudioEnabled }
          }));
        }
      }
    }
  }, [localStream, isVideoEnabled, isAudioEnabled]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        const newAudioState = !isAudioEnabled;
        audioTrack.enabled = newAudioState;
        setIsAudioEnabled(newAudioState);

        // Update local participant
        setParticipants(prev => {
          const newParticipants = new Map(prev);
          const localParticipant = newParticipants.get(userIdRef.current);
          
          if (localParticipant) {
            newParticipants.set(userIdRef.current, {
              ...localParticipant,
              mediaState: { ...localParticipant.mediaState, audio: newAudioState }
            });
          }
          
          return newParticipants;
        });

        // Broadcast media state change
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'media-state-changed',
            mediaState: { video: isVideoEnabled, audio: newAudioState }
          }));
        }
      }
    }
  }, [localStream, isVideoEnabled, isAudioEnabled]);

  // Leave call
  const leaveCall = useCallback(() => {
    console.log('🚪 Leaving call...');

    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    // Close all peer connections
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close(1000, 'User left call');
      wsRef.current = null;
    }

    // Clear participants
    setParticipants(new Map());
    
    setConnectionStatus({
      status: 'disconnected',
      message: 'Left the call'
    });
  }, [localStream]);

  // Refresh participants
  const refreshParticipants = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('🔄 Refreshing participants...');
      wsRef.current.send(JSON.stringify({
        type: 'register',
        id: userIdRef.current,
        roomId: currentRoomRef.current
      }));
    }
  }, []);

  // Join room
  const joinRoom = useCallback((newRoomId?: string) => {
    const targetRoomId = newRoomId || roomId;
    currentRoomRef.current = targetRoomId;
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'register',
        id: userIdRef.current,
        roomId: targetRoomId
      }));
    }
  }, [roomId]);

  // Initialize everything on mount (only once)
  useEffect(() => {
    let isInitialized = false;
    
    const initialize = async () => {
      if (isInitialized) return;
      isInitialized = true;
      
      try {
        console.log('🚀 Starting initialization...');
        await initializeMediaStream();
        initializeWebSocket();
      } catch (error) {
        console.error('❌ Failed to initialize:', error);
        isInitialized = false;
      }
    };

    initialize();

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up WebRTC hook...');
      isInitialized = false;
      
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      
      peerConnectionsRef.current.forEach(pc => pc.close());
      peerConnectionsRef.current.clear();
      
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        // Clear heartbeat interval
        if ((wsRef.current as any).heartbeatInterval) {
          clearInterval((wsRef.current as any).heartbeatInterval);
        }
        wsRef.current.close(1000, 'Component unmounted');
        wsRef.current = null;
      }
    };
  }, []); // Empty dependency array - only run once on mount

  return {
    participants,
    localStream,
    connectionStatus,
    isVideoEnabled,
    isAudioEnabled,
    toggleVideo,
    toggleAudio,
    leaveCall,
    refreshParticipants,
    joinRoom
  };
}; 