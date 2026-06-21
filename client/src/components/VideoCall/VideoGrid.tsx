import React, { useMemo, useCallback } from 'react';
import { Box, useTheme, useMediaQuery, Typography } from '@mui/material';
import { VideoTile } from './VideoTile';
import { Participant, GridLayout } from '../../types/webrtc';
import { Videocam } from '@mui/icons-material';

interface VideoGridProps {
  participants: Participant[];
  onError?: (error: string) => void;
}

export const VideoGrid: React.FC<VideoGridProps> = ({ participants, onError }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isPortrait = useMediaQuery('(orientation: portrait)');

  // Compute a balanced, uniform grid from the REAL participant count.
  // No padding/skeleton tiles — the grid always matches who is actually here,
  // which is what keeps the layout clean (like Google Meet / WhatsApp).
  const calculateOptimalLayout = useCallback((count: number): GridLayout => {
    if (count <= 1) return { cols: 1, rows: 1 };

    // Two participants split the screen in half. On phones / portrait that is
    // top-and-bottom; on wide desktop screens side-by-side reads better.
    if (count === 2) {
      return isPortrait || isMobile ? { cols: 1, rows: 2 } : { cols: 2, rows: 1 };
    }

    // For everyone else, a near-square grid: columns = ceil(sqrt(n)).
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);

    // In portrait orientation prefer more rows than columns so each tile is
    // taller and faces are larger.
    if (isPortrait && cols > rows) {
      return { cols: rows, rows: cols };
    }

    return { cols, rows };
  }, [isMobile, isPortrait]);

  const gridLayout = useMemo(
    () => calculateOptimalLayout(participants.length),
    [participants.length, calculateOptimalLayout]
  );

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

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(${gridLayout.cols}, 1fr)`,
        gridTemplateRows: `repeat(${gridLayout.rows}, 1fr)`,
        gap: { xs: 1, sm: 1.5, md: 2 },
        height: '100%',
        width: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {participants.map((participant) => (
        <Box
          key={participant.id}
          sx={{
            position: 'relative',
            width: '100%',
            height: '100%',
            minHeight: 0,
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
    </Box>
  );
}; 