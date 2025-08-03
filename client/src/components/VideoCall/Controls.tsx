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
  const [currentFacingMode, setCurrentFacingMode] = useState<'user' | 'environment'>('user');
  const [isHoveringControls, setIsHoveringControls] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const buttonSize = isMobile ? 50 : 56;
  const iconSize = isMobile ? 24 : 28;

  // Auto-hide controls after 4 seconds (but not if hovering)
  useEffect(() => {
    if (isControlsVisible && !isHoveringControls) {
      // Clear any existing timer
      if (hideTimer) {
        clearTimeout(hideTimer);
      }
      
      // Set new timer to hide controls
      const timer = setTimeout(() => {
        setIsControlsVisible(false);
      }, 4000);
      
      setHideTimer(timer);
    }

    return () => {
      if (hideTimer) {
        clearTimeout(hideTimer);
      }
    };
  }, [isControlsVisible, isHoveringControls]);

  // Show controls on user interaction (click or mouse move)
  useEffect(() => {
    let mouseMoveTimeout: NodeJS.Timeout;

    const handleUserActivity = (event: MouseEvent) => {
      const target = event.target as Element;
      // Don't show controls if interacting with control buttons themselves
      if (!target.closest('[role="toolbar"]')) {
        setIsControlsVisible(true);
      }
    };

    const handleMouseMove = () => {
      // Debounce mouse movement to avoid too frequent updates
      clearTimeout(mouseMoveTimeout);
      mouseMoveTimeout = setTimeout(() => {
        setIsControlsVisible(true);
      }, 100);
    };

    // Listen for clicks and mouse movement
    document.addEventListener('click', handleUserActivity);
    document.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      clearTimeout(mouseMoveTimeout);
      document.removeEventListener('click', handleUserActivity);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const handleFlipCamera = async () => {
    try {
      // Determine the new facing mode
      const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
      
      // Get new video stream with different facing mode
      const newStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: newFacingMode },
        audio: isAudioEnabled
      });

      // Get current video element to replace the stream
      const videoElements = document.querySelectorAll('video');
      const localVideo = Array.from(videoElements).find(video => video.muted); // Local video is muted
      
      if (localVideo && localVideo.srcObject) {
        // Stop current video tracks
        const currentStream = localVideo.srcObject as MediaStream;
        currentStream.getVideoTracks().forEach(track => track.stop());
        
        // Replace with new stream
        localVideo.srcObject = newStream;
        
        // Update facing mode state
        setCurrentFacingMode(newFacingMode);
        
        console.log(`Camera flipped to: ${newFacingMode}`);
      }
    } catch (error) {
      console.error('Failed to flip camera:', error);
      // If flip fails, fall back to toggling video
      onToggleVideo();
      setTimeout(() => onToggleVideo(), 100);
    }
  };

  return (
    <Fade in={isControlsVisible} timeout={300}>
      <Box
        component="div"
        role="toolbar"
        aria-label="Video call controls"
        onMouseEnter={() => setIsHoveringControls(true)}
        onMouseLeave={() => setIsHoveringControls(false)}
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