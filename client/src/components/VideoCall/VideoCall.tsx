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
        background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)'
        }}
      >
        <Typography variant="h5" component="h1" sx={{ fontWeight: 300 }}>
          {userName ? `${userName}'s Video Call` : 'Live Video Call'}
        </Typography>
        
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

        {/* Participant Counter - Moved to absolute positioning to not affect grid height */}
        {participantCount > 0 && (
          <Box
            sx={{
              position: 'absolute',
              bottom: { xs: 80, sm: 90, md: 100 },
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 999
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: 'rgba(255, 255, 255, 0.7)',
                background: 'rgba(0, 0, 0, 0.6)',
                px: 2,
                py: 0.5,
                borderRadius: 2,
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                fontSize: { xs: '0.75rem', sm: '0.875rem' }
              }}
            >
              {participantCount} participant{participantCount !== 1 ? 's' : ''} in call
            </Typography>
          </Box>
        )}
      </Container>

      {/* Controls */}
      <Controls
        isVideoEnabled={isVideoEnabled}
        isAudioEnabled={isAudioEnabled}
        onToggleVideo={toggleVideo}
        onToggleAudio={toggleAudio}
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