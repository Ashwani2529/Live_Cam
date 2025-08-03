import React, { useMemo, useCallback } from 'react';
import { Box, useTheme, useMediaQuery, Skeleton, Typography } from '@mui/material';
import { VideoTile } from './VideoTile';
import { Participant, GridLayout } from '../../types/webrtc';
import { PersonAdd, Videocam } from '@mui/icons-material';

interface VideoGridProps {
  participants: Participant[];
  onError?: (error: string) => void;
}

// Skeleton tile component for waiting participants
const SkeletonTile: React.FC<{ index: number }> = ({ index }) => (
  <Box
    sx={{
      position: 'relative',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: 2,
      border: '2px dashed rgba(255, 255, 255, 0.2)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.3s ease',
      '&:hover': {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderColor: 'rgba(255, 255, 255, 0.3)',
      }
    }}
  >
    <PersonAdd 
      sx={{ 
        fontSize: { xs: 32, sm: 40, md: 48 }, 
        color: 'rgba(255, 255, 255, 0.4)',
        mb: 1
      }} 
    />
    <Typography 
      variant="caption" 
      sx={{ 
        color: 'rgba(255, 255, 255, 0.6)',
        textAlign: 'center',
        fontSize: { xs: '0.7rem', sm: '0.75rem' }
      }}
    >
      Waiting for participant
    </Typography>
  </Box>
);

export const VideoGrid: React.FC<VideoGridProps> = ({ participants, onError }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Calculate optimal grid layout based on participant count
  const calculateOptimalLayout = useCallback((participantCount: number): GridLayout => {
    if (participantCount === 0) return { cols: 1, rows: 1 };
    if (participantCount === 1) return { cols: 1, rows: 1 };

    let cols: number, rows: number;

    if (isSmallMobile) {
      // Small mobile: prioritize vertical stacking
      if (participantCount <= 2) {
        cols = 1;
        rows = 2;
      } else if (participantCount <= 4) {
        cols = 2;
        rows = 2;
      } else if (participantCount <= 6) {
        cols = 2;
        rows = 3;
      } else {
        cols = 2;
        rows = Math.ceil(participantCount / 2);
      }
    } else if (isMobile) {
      // Regular mobile: balanced approach
      if (participantCount <= 2) {
        cols = 1;
        rows = 2;
      } else if (participantCount <= 4) {
        cols = 2;
        rows = 2;
      } else if (participantCount <= 6) {
        cols = 2;
        rows = 3;
      } else if (participantCount <= 9) {
        cols = 3;
        rows = 3;
      } else {
        cols = 3;
        rows = Math.ceil(participantCount / 3);
      }
    } else {
      // Desktop: optimize for screen real estate
      if (participantCount <= 2) {
        cols = 2;
        rows = 1;
      } else if (participantCount <= 4) {
        cols = 2;
        rows = 2;
      } else if (participantCount <= 6) {
        cols = 3;
        rows = 2;
      } else if (participantCount <= 9) {
        cols = 3;
        rows = 3;
      } else if (participantCount <= 12) {
        cols = 4;
        rows = 3;
      } else if (participantCount <= 16) {
        cols = 4;
        rows = 4;
      } else {
        cols = 5;
        rows = Math.ceil(participantCount / 5);
      }
    }

    return { cols, rows };
  }, [isMobile, isSmallMobile]);

  // Memoize grid calculations
  const gridLayout = useMemo(() => {
    const participantCount = Math.max(participants.length, 1);
    return calculateOptimalLayout(participantCount);
  }, [participants.length, calculateOptimalLayout]);

  const handleParticipantError = useCallback((participantId: string, error: string) => {
    console.error(`VideoTile Error for ${participantId}:`, error);
    onError?.(`Video error for participant ${participantId}: ${error}`);
  }, [onError]);

  // Show loading state when no participants
  if (participants.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'rgba(255, 255, 255, 0.7)',
          textAlign: 'center',
          gap: 2
        }}
      >
        <Videocam sx={{ fontSize: { xs: 48, sm: 64 }, opacity: 0.5 }} />
        <Typography variant={isMobile ? 'h6' : 'h5'} sx={{ fontWeight: 300 }}>
          Initializing video call...
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.8 }}>
          Please wait while we connect you to the call
        </Typography>
      </Box>
    );
  }

  // Calculate total slots needed (show up to 4 skeleton tiles for better UX)
  const totalSlots = Math.min(gridLayout.cols * gridLayout.rows, participants.length + Math.min(4, 8 - participants.length));
  const skeletonCount = Math.max(0, totalSlots - participants.length);

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(${gridLayout.cols}, 1fr)`,
        gridTemplateRows: `repeat(${gridLayout.rows}, 1fr)`,
        gap: { xs: 1, sm: 1.5, md: 2 },
        height: '100%',
        width: '100%',
        padding: { xs: 0.5, sm: 1 },
        boxSizing: 'border-box',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Render actual participants */}
      {participants.map((participant, index) => (
        <Box
          key={participant.id}
          sx={{
            position: 'relative',
            width: '100%',
            height: '100%',
            minHeight: { xs: 120, sm: 150, md: 180 },
            display: 'flex',
          }}
        >
          <VideoTile
            participant={participant}
            dimensions={{ width: '100%', height: '100%' }}
            onError={(error) => handleParticipantError(participant.id, error)}
          />
        </Box>
      ))}

      {/* Render skeleton tiles for waiting participants */}
      {Array.from({ length: skeletonCount }, (_, index) => (
        <SkeletonTile key={`skeleton-${index}`} index={index} />
      ))}
    </Box>
  );
}; 