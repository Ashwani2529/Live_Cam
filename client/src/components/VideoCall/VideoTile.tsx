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
  dimensions?: TileDimensions;
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
    return participant.isLocal ? 'You' : `Participant ${participant.id.substring(0, 6)}`;
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
        width: dimensions?.width || '100%',
        height: dimensions?.height || '100%',
        minWidth: dimensions?.width || 150,
        minHeight: dimensions?.height || 120,
        maxWidth: dimensions?.width || 400,
        maxHeight: dimensions?.height || 300,
        backgroundColor: '#000',
        borderRadius: 2,
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: 'scale(1)',
        opacity: 1,
        animation: 'videoEnter 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'scale(1.02)',
          boxShadow: '0 6px 25px rgba(0, 0, 0, 0.4)'
        },
        '@keyframes videoEnter': {
          from: {
            transform: 'scale(0.8)',
            opacity: 0
          },
          to: {
            transform: 'scale(1)',
            opacity: 1
          }
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
          background: 'linear-gradient(45deg, #1a1a1a 25%, transparent 25%), linear-gradient(-45deg, #1a1a1a 25%, transparent 25%)',
          backgroundSize: '20px 20px'
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