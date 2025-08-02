export interface Participant {
  id: string;
  socketId?: string;
  stream?: MediaStream;
  isLocal: boolean;
  mediaState: MediaState;
  connectionState: RTCPeerConnectionState;
}

export interface MediaState {
  video: boolean;
  audio: boolean;
}

export interface VideoElement {
  wrapper: HTMLDivElement;
  video: HTMLVideoElement;
  status: HTMLDivElement;
}

export interface GridLayout {
  cols: number;
  rows: number;
}

export interface TileDimensions {
  width: number;
  height: number;
}

export interface ConnectionStatus {
  status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'loading-participants';
  message?: string;
  participantCount?: number;
}

// WebSocket message types
export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export interface RegisterMessage extends WebSocketMessage {
  type: 'register';
  id: string;
  roomId?: string;
}

export interface SignalMessage extends WebSocketMessage {
  type: 'signal';
  target: string;
  signal: RTCSessionDescriptionInit | RTCIceCandidateInit;
  sender: string;
}

export interface MediaStateChangedMessage extends WebSocketMessage {
  type: 'media-state-changed';
  mediaState: MediaState;
}

export interface ExistingParticipantsMessage extends WebSocketMessage {
  type: 'existing-participants';
  participants: string[];
  roomId: string;
}

export interface NewPeerMessage extends WebSocketMessage {
  type: 'new-peer';
  id: string;
  roomId: string;
}

export interface PeerDisconnectedMessage extends WebSocketMessage {
  type: 'peer-disconnected';
  id: string;
  roomId: string;
}

export interface PeerReconnectingMessage extends WebSocketMessage {
  type: 'peer-reconnecting';
  peerId: string;
}

export interface RoomStatusMessage extends WebSocketMessage {
  type: 'room-status';
  message: string;
  participantCount: number;
  roomId: string;
}

export interface ErrorMessage extends WebSocketMessage {
  type: 'error';
  message: string;
}

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
}

export interface Room {
  id: string;
  participants: Participant[];
  createdAt: string;
}

export interface UseWebRTCReturn {
  participants: Map<string, Participant>;
  localStream: MediaStream | null;
  connectionStatus: ConnectionStatus;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  toggleVideo: () => void;
  toggleAudio: () => void;
  leaveCall: () => void;
  refreshParticipants: () => void;
  joinRoom: (roomId?: string) => void;
}

export interface VideoCallProps {
  roomId?: string;
  onLeave?: () => void;
  onError?: (error: string) => void;
}

export interface VideoTileProps {
  participant: Participant;
  dimensions?: TileDimensions;
  onClick?: () => void;
  onError?: (error: string) => void;
}

export interface ControlsProps {
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onLeave: () => void;
  participantCount: number;
}

export interface DebugInfo {
  userId: string;
  participantCount: number;
  connectionStates: Record<string, RTCPeerConnectionState>;
  iceConnectionStates: Record<string, RTCIceConnectionState>;
  streamInfo: Record<string, { hasVideo: boolean; hasAudio: boolean; dimensions: string }>;
  socketConnected: boolean;
  roomId: string;
} 