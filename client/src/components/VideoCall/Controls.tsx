import React, { useState, useEffect } from 'react';
import { Box, IconButton, Tooltip, Zoom, useMediaQuery, useTheme, Fade } from '@mui/material';
import { 
  Videocam, 
  VideocamOff, 
  Mic, 
  MicOff, 
  CallEnd,
  FlipCameraIos
} from '@mui/icons-material';
import { ControlsProps } from '../../types/webrtc';

export const Controls: React.FC<ControlsProps> = ({
  isVideoEnabled,
  isAudioEnabled,
  onToggleVideo,
  onToggleAudio,
  onLeave,
  participantCount
}) => {
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [hideTimer, setHideTimer] = useState<NodeJS.Timeout | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const buttonSize = isMobile ? 50 : 56;
  const iconSize = isMobile ? 24 : 28;

  // Auto-hide controls after 4 seconds
  useEffect(() => {
    const startHideTimer = () => {
      if (hideTimer) {
        clearTimeout(hideTimer);
      }
      const timer = setTimeout(() => {
        setIsControlsVisible(false);
      }, 4000);
      setHideTimer(timer);
    };

    if (isControlsVisible) {
      startHideTimer();
    }

    return () => {
      if (hideTimer) {
        clearTimeout(hideTimer);
      }
    };
  }, [isControlsVisible, hideTimer]);

  // Show controls when clicked anywhere
  useEffect(() => {
    const handleClick = () => {
      setIsControlsVisible(true);
    };

    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, []);

  const handleFlipCamera = () => {
    // Get the current video track
    navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'user' } // This will request the front camera
    }).then(stream => {
      // Logic to flip camera would be handled here
      // For now, just toggle video to simulate camera flip
      onToggleVideo();
      setTimeout(() => onToggleVideo(), 100);
    }).catch(console.error);
  };

  return (
    <Fade in={isControlsVisible} timeout={300}>
      <Box
        component="div"
        role="toolbar"
        aria-label="Video call controls"
        sx={{
          position: 'fixed',
          bottom: { xs: 20, sm: 30 },
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: { xs: 1, sm: 2 },
          background: 'rgba(0, 0, 0, 0.85)',
          p: { xs: 1.5, sm: 2 },
          borderRadius: 6,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          zIndex: 1000
        }}
      >
      {/* Video Toggle */}
      <Tooltip 
        title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'} 
        placement="top"
        TransitionComponent={Zoom}
      >
        <IconButton
          onClick={onToggleVideo}
          sx={{
            width: buttonSize,
            height: buttonSize,
            backgroundColor: isVideoEnabled ? '#28a745' : '#dc3545',
            color: 'white',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              backgroundColor: isVideoEnabled ? '#218838' : '#c82333',
              transform: 'scale(1.08)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
            },
            '&:active': {
              transform: 'scale(0.95)'
            }
          }}
          aria-label={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          aria-pressed={isVideoEnabled}
        >
          {isVideoEnabled ? (
            <Videocam sx={{ fontSize: iconSize }} />
          ) : (
            <VideocamOff sx={{ fontSize: iconSize }} />
          )}
        </IconButton>
      </Tooltip>

      {/* Audio Toggle */}
      <Tooltip 
        title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'} 
        placement="top"
        TransitionComponent={Zoom}
      >
        <IconButton
          onClick={onToggleAudio}
          sx={{
            width: buttonSize,
            height: buttonSize,
            backgroundColor: isAudioEnabled ? '#007bff' : '#dc3545',
            color: 'white',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              backgroundColor: isAudioEnabled ? '#0056b3' : '#c82333',
              transform: 'scale(1.08)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
            },
            '&:active': {
              transform: 'scale(0.95)'
            }
          }}
          aria-label={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
          aria-pressed={isAudioEnabled}
        >
          {isAudioEnabled ? (
            <Mic sx={{ fontSize: iconSize }} />
          ) : (
            <MicOff sx={{ fontSize: iconSize }} />
          )}
        </IconButton>
      </Tooltip>

      {/* Flip Camera */}
      <Tooltip 
        title="Flip camera" 
        placement="top"
        TransitionComponent={Zoom}
      >
        <IconButton
          onClick={handleFlipCamera}
          sx={{
            width: buttonSize,
            height: buttonSize,
            backgroundColor: '#6c757d',
            color: 'white',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              backgroundColor: '#5a6268',
              transform: 'scale(1.08)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
            },
            '&:active': {
              transform: 'scale(0.95)'
            }
          }}
          aria-label="Flip camera"
        >
          <FlipCameraIos sx={{ fontSize: iconSize }} />
        </IconButton>
      </Tooltip>

      {/* Leave Call */}
      <Tooltip 
        title="Leave call" 
        placement="top"
        TransitionComponent={Zoom}
      >
        <IconButton
          onClick={onLeave}
          sx={{
            width: buttonSize,
            height: buttonSize,
            backgroundColor: '#dc3545',
            color: 'white',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              backgroundColor: '#c82333',
              transform: 'scale(1.08)',
              boxShadow: '0 4px 20px rgba(220, 53, 69, 0.4)'
            },
            '&:active': {
              transform: 'scale(0.95)'
            }
          }}
          aria-label="Leave call"
        >
          <CallEnd sx={{ fontSize: iconSize }} />
        </IconButton>
      </Tooltip>
      </Box>
    </Fade>
  );
}; 