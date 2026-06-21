import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Box, Typography, Fade, CircularProgress } from '@mui/material';
import { 
  Videocam, 
  VideocamOff, 
  Mic, 
  MicOff, 
  SignalCellularAlt
} from '@mui/icons-material';
import { Participant, TileDimensions } from '../../types/webrtc';

interface VideoTileProps {
  participant: Participant;
  dimensions?: TileDimensions | { width: string; height: string };
  onError?: (error: string) => void;
}

export const VideoTile: React.FC<VideoTileProps> = ({ 
  participant, 
  dimensions,
  onError 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const setupInProgressRef = useRef(false);

  // Handle video stream assignment
  useEffect(() => {
    const video = videoRef.current;
    if (!video || setupInProgressRef.current) return;

    // If no stream yet, show loading state
    if (!participant.stream) {
      console.log(`Waiting for stream from ${participant.id}`);
      setIsLoading(true);
      setHasError(false);
      setVideoLoaded(false);
      return;
    }

    // Check if stream has active tracks
    const activeTracks = participant.stream.getTracks().filter(track => track.readyState === 'live');
    if (activeTracks.length === 0) {
      console.warn(`No active tracks for ${participant.id}`);
      setHasError(true);
      setIsLoading(false);
      return;
    }

    // Check if video is already set up with this stream
    if (video.srcObject === participant.stream && videoLoaded) {
      console.log(`Video already set up for ${participant.id}`);
      return;
    }

    // Prevent multiple simultaneous setups
    setupInProgressRef.current = true;

    setIsLoading(true);
    setHasError(false);
    setVideoLoaded(false);

    // Set the stream
    video.srcObject = participant.stream;

    // Event handlers
    const handleLoadedMetadata = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        setVideoLoaded(true);
        setIsLoading(false);
        setupInProgressRef.current = false;
      }
    };

    const handleLoadedData = () => {
      setVideoLoaded(true);
      setIsLoading(false);
      setupInProgressRef.current = false;
    };

    const handleCanPlay = () => {
      setVideoLoaded(true);
      setIsLoading(false);
      setupInProgressRef.current = false;

      // Auto-play for remote videos
      if (!participant.isLocal) {
        video.play().catch(error => {
          console.warn(`Auto-play failed for ${participant.id}:`, error.message);
        });
      }
    };

    const handlePlaying = () => {
      setVideoLoaded(true);
      setIsLoading(false);
      setupInProgressRef.current = false;
    };

    const handleError = (error: Event) => {
      setHasError(true);
      setIsLoading(false);
      setupInProgressRef.current = false;
      onError?.(`Video playback error for ${participant.id}`);
    };

    const handleStalled = () => {
      console.warn(`⏸️ Video stalled for ${participant.id}`);
    };

    const handleWaiting = () => {
      console.log(`Video waiting for ${participant.id}`);
    };

    // Add event listeners
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('error', handleError);
    video.addEventListener('stalled', handleStalled);
    video.addEventListener('waiting', handleWaiting);

    // Timeout fallback
    const timeout = setTimeout(() => {
      if (isLoading && !videoLoaded) {
        console.warn(`Video loading timeout for ${participant.id}`);
        setupInProgressRef.current = false;
        if (video.videoWidth > 0) {
          setVideoLoaded(true);
          setIsLoading(false);
        } else {
          setHasError(true);
          setIsLoading(false);
        }
      }
    }, 5000);

    // Cleanup
    return () => {
      setupInProgressRef.current = false;
      clearTimeout(timeout);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('error', handleError);
      video.removeEventListener('stalled', handleStalled);
      video.removeEventListener('waiting', handleWaiting);
    };
  }, [participant.stream, participant.id, participant.isLocal, onError]);

  // Force refresh stream if needed
  const refreshStream = useCallback(() => {
    const video = videoRef.current;
    if (video && participant.stream && !setupInProgressRef.current) {
      setupInProgressRef.current = true;
      
      const currentStream = participant.stream;
      video.srcObject = null;
      
      setTimeout(() => {
        video.srcObject = currentStream;
        video.play().catch(error => {
          console.warn(`Play failed after refresh for ${participant.id}:`, error.message);
          setupInProgressRef.current = false;
        });
      }, 100);
    }
  }, [participant.stream, participant.id]);

  // Auto-refresh if stream exists but video not showing (simplified)
  useEffect(() => {
    if (participant.stream && !participant.isLocal && !videoLoaded && !isLoading && !setupInProgressRef.current && !hasError) {
      const refreshTimer = setTimeout(() => {
        console.log(`Auto-refreshing video for ${participant.id}`);
        refreshStream();
      }, 5000); // Increased timeout to 5 seconds

      return () => clearTimeout(refreshTimer);
    }
  }, [participant.stream, participant.isLocal, videoLoaded, isLoading, hasError, refreshStream]);

  const getParticipantName = () => {
    if (participant.isLocal) {
      return participant.name || 'You';
    }
    return participant.name || `Participant ${participant.id.substring(0, 6)}`;
  };

  const getConnectionColor = () => {
    switch (participant.connectionState) {
      case 'connected': return '#4caf50';
      case 'connecting': return '#ff9800';
      case 'disconnected': return '#f44336';
      case 'failed': return '#d32f2f';
      default: return '#9e9e9e';
    }
  };

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: '#0b0f19',
        borderRadius: 3,
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        transition: 'box-shadow 0.25s ease, border-color 0.25s ease',
        opacity: 1,
        animation: 'videoEnter 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          boxShadow: '0 6px 28px rgba(0, 0, 0, 0.5)',
          borderColor: 'rgba(33, 150, 243, 0.6)'
        },
        '@keyframes videoEnter': {
          from: { opacity: 0, transform: 'translateY(8px)' },
          to: { opacity: 1, transform: 'translateY(0)' }
        }
      }}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={participant.isLocal}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: videoLoaded && !hasError ? 'block' : 'none',
          // Mirror only the local front ("user") camera so the self-view feels
          // like a mirror. The back camera and all remote feeds stay un-mirrored.
          transform:
            participant.isLocal && participant.facingMode !== 'environment'
              ? 'scaleX(-1)'
              : 'none',
          backgroundColor: '#0b0f19'
        }}
      />

      {/* Loading Indicator */}
      {isLoading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.8)'
          }}
        >
          <CircularProgress size={40} sx={{ color: 'white' }} />
        </Box>
      )}

      {/* Error State */}
      {hasError && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white'
          }}
        >
          <VideocamOff sx={{ fontSize: 40, mb: 1, opacity: 0.6 }} />
          <Typography variant="body2" align="center">
            Video unavailable
          </Typography>
          <Typography 
            variant="caption" 
            sx={{ 
              mt: 1, 
              cursor: 'pointer', 
              textDecoration: 'underline',
              '&:hover': { color: '#90caf9' }
            }}
            onClick={refreshStream}
          >
            Tap to retry
          </Typography>
        </Box>
      )}

      {/* No Video State (video disabled) */}
      {!participant.mediaState.video && !isLoading && !hasError && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            color: 'white'
          }}
        >
          <VideocamOff sx={{ fontSize: 48, mb: 1, opacity: 0.7 }} />
          <Typography variant="body2" align="center">
            Camera off
          </Typography>
        </Box>
      )}

      {/* Overlay with participant info */}
      <Fade in={true}>
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(transparent, rgba(0, 0, 0, 0.8))',
            color: 'white',
            p: { xs: 1, sm: 1.5 },
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backdropFilter: 'blur(4px)'
          }}
        >
          <Typography
            variant="body2"
            sx={{
              fontWeight: 500,
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '60%'
            }}
          >
            {getParticipantName()}
          </Typography>

          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            {/* Connection Status */}
            <SignalCellularAlt
              sx={{
                fontSize: 16,
                color: getConnectionColor(),
                filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8))'
              }}
            />

            {/* Audio Status */}
            {participant.mediaState.audio ? (
              <Mic sx={{ fontSize: 16, color: 'white' }} />
            ) : (
              <MicOff sx={{ fontSize: 16, color: '#f44336' }} />
            )}

            {/* Video Status */}
            {participant.mediaState.video ? (
              <Videocam sx={{ fontSize: 16, color: 'white' }} />
            ) : (
              <VideocamOff sx={{ fontSize: 16, color: '#f44336' }} />
            )}
          </Box>
        </Box>
      </Fade>
    </Box>
  );
}; 