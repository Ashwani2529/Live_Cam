import React from 'react';
import { Box, Container, Typography, Alert } from '@mui/material';
import { useWebRTC } from '../../hooks/useWebRTC';
import { VideoGrid } from './VideoGrid';
import { Controls } from './Controls';
import { ConnectionStatus } from './ConnectionStatus';
import { VideoCallProps } from '../../types/webrtc';

export const VideoCall: React.FC<VideoCallProps> = ({ 
  roomId = 'default-room',
  userName = null,
  onLeave, 
  onError 
}) => {
  const {
    participants,
    connectionStatus,
    isVideoEnabled,
    isAudioEnabled,
    toggleVideo,
    toggleAudio,
    switchCamera,
    leaveCall,
    refreshParticipants
  } = useWebRTC(roomId, userName);

  const handleLeave = () => {
    leaveCall();
    onLeave?.();
  };

  const handleError = (error: string) => {
    console.error('VideoCall Error:', error);
    onError?.(error);
  };

  const participantsArray = Array.from(participants.values());
  const participantCount = participantsArray.length;

  // Debug: Log participants
  React.useEffect(() => {
    console.log(`👥 Participants updated: ${participantCount}`, participantsArray.map(p => ({ id: p.id, hasStream: !!p.stream, connectionState: p.connectionState })));
  }, [participantCount, participantsArray]);

  return (
    <Box
      sx={{
        height: '100vh',
        background: 'radial-gradient(circle at 20% 0%, #15294d 0%, #0b0f19 60%, #07090f 100%)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background: 'rgba(11, 15, 25, 0.7)',
          backdropFilter: 'blur(12px)',
          color: 'white',
          px: { xs: 2, sm: 3 },
          py: { xs: 1.25, sm: 1.5 },
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: '#34d399',
              boxShadow: '0 0 0 4px rgba(52, 211, 153, 0.18)',
              flexShrink: 0,
              animation: 'pulse 2s ease-in-out infinite',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.4 }
              }
            }}
          />
          <Typography
            variant="h6"
            component="h1"
            sx={{
              fontWeight: 600,
              letterSpacing: 0.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: { xs: '1rem', sm: '1.25rem' }
            }}
          >
            {userName ? `${userName}'s Call` : 'Live Video Call'}
          </Typography>
        </Box>

        <ConnectionStatus
          status={connectionStatus}
          onRefresh={refreshParticipants}
        />
      </Box>

      {/* Main Content */}
      <Container
        maxWidth={false}
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          p: { xs: 0.5, sm: 1, md: 1.5 },
          minHeight: 0,
          overflow: 'hidden'
        }}
      >
        {/* Error Display */}
        {connectionStatus.status === 'disconnected' && connectionStatus.message?.includes('Failed') && (
          <Alert 
            severity="error" 
            sx={{ mb: 2 }}
            onClose={() => handleError('Connection error cleared')}
          >
            {connectionStatus.message}. Please check your camera and microphone permissions.
          </Alert>
        )}

        {/* Video Grid */}
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          minHeight: 0, 
          width: '100%',
          position: 'relative'
        }}>
          <VideoGrid 
            participants={participantsArray}
            onError={handleError}
          />
        </Box>

      </Container>

      {/* Controls */}
      <Controls
        isVideoEnabled={isVideoEnabled}
        isAudioEnabled={isAudioEnabled}
        onToggleVideo={toggleVideo}
        onToggleAudio={toggleAudio}
        onSwitchCamera={switchCamera}
        onLeave={handleLeave}
        participantCount={participantCount}
      />

      {/* Debug Info (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 80,
            left: 16,
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            p: 1,
            borderRadius: 1,
            fontSize: '0.75rem',
            maxWidth: 300,
            zIndex: 1000
          }}
        >
          <Typography variant="caption" display="block">
            Room: {roomId}
          </Typography>
          <Typography variant="caption" display="block">
            Status: {connectionStatus.status}
          </Typography>
          <Typography variant="caption" display="block">
            Participants: {participantCount}
          </Typography>
          <Typography variant="caption" display="block">
            Video: {isVideoEnabled ? 'ON' : 'OFF'} | Audio: {isAudioEnabled ? 'ON' : 'OFF'}
          </Typography>
        </Box>
      )}
    </Box>
  );
}; 