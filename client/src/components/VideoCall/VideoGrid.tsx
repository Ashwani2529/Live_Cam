import React, { useMemo, useCallback } from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import { VideoTile } from './VideoTile';
import { Participant, GridLayout, TileDimensions } from '../../types/webrtc';

interface VideoGridProps {
  participants: Participant[];
  onError?: (error: string) => void;
}

export const VideoGrid: React.FC<VideoGridProps> = ({ participants, onError }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Calculate optimal grid layout
  const calculateOptimalLayout = useCallback((
    participantCount: number,
    containerWidth: number,
    containerHeight: number
  ): GridLayout => {
    if (participantCount === 0) return { cols: 1, rows: 1 };
    if (participantCount === 1) return { cols: 1, rows: 1 };

    const isLandscape = containerWidth > containerHeight;

    let cols: number, rows: number;

    if (isSmallMobile && !isLandscape) {
      // Small mobile: prioritize vertical stacking
      if (participantCount <= 2) {
        cols = 1;
        rows = participantCount;
      } else if (participantCount <= 4) {
        cols = 2;
        rows = Math.ceil(participantCount / 2);
      } else {
        cols = 2;
        rows = Math.ceil(participantCount / 2);
      }
    } else if (isMobile) {
      // Regular mobile: balanced approach
      if (participantCount <= 2) {
        cols = isLandscape ? 2 : 1;
        rows = isLandscape ? 1 : participantCount;
      } else if (participantCount <= 4) {
        cols = 2;
        rows = Math.ceil(participantCount / 2);
      } else if (participantCount <= 6) {
        cols = isLandscape ? 3 : 2;
        rows = Math.ceil(participantCount / cols);
      } else {
        cols = isLandscape ? 3 : 2;
        rows = Math.ceil(participantCount / cols);
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

  // Calculate tile dimensions
  const calculateTileDimensions = useCallback((
    layout: GridLayout,
    containerWidth: number,
    containerHeight: number,
    gap: number
  ): TileDimensions => {
    const { cols, rows } = layout;

    const totalGapWidth = gap * (cols - 1);
    const totalGapHeight = gap * (rows - 1);

    const availableWidth = containerWidth - totalGapWidth;
    const availableHeight = containerHeight - totalGapHeight;

    let tileWidth = availableWidth / cols;
    let tileHeight = availableHeight / rows;

    // Maintain reasonable aspect ratio
    const targetAspectRatio = isMobile ? 4/3 : 16/9;

    if (tileWidth / tileHeight > targetAspectRatio * 1.5) {
      tileWidth = tileHeight * targetAspectRatio;
    } else if (tileHeight / tileWidth > (1/targetAspectRatio) * 1.5) {
      tileHeight = tileWidth / targetAspectRatio;
    }

    // Ensure minimum and maximum sizes
    const minTileSize = isSmallMobile ? 120 : isMobile ? 150 : 180;
    const maxTileSize = isMobile ? 300 : 400;

    tileWidth = Math.max(minTileSize, Math.min(maxTileSize, tileWidth));
    tileHeight = Math.max(minTileSize * 0.75, Math.min(maxTileSize * 0.75, tileHeight));

    return { width: tileWidth, height: tileHeight };
  }, [isMobile, isSmallMobile]);

  // Memoize grid calculations
  const gridLayout = useMemo(() => {
    const participantCount = participants.length;
    
    // Use viewport dimensions as approximation
    const containerWidth = window.innerWidth - (isMobile ? 32 : 48);
    const containerHeight = window.innerHeight - (isMobile ? 120 : 160);
    
    const layout = calculateOptimalLayout(participantCount, containerWidth, containerHeight);
    const gap = isMobile ? 8 : 12;
    const dimensions = calculateTileDimensions(layout, containerWidth, containerHeight, gap);
    
    return {
      layout,
      dimensions,
      gap
    };
  }, [participants.length, calculateOptimalLayout, calculateTileDimensions, isMobile]);

  const handleParticipantError = useCallback((participantId: string, error: string) => {
    console.error(`VideoTile Error for ${participantId}:`, error);
    onError?.(`Video error for participant ${participantId}: ${error}`);
  }, [onError]);

  if (participants.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: '1.2rem',
          textAlign: 'center'
        }}
      >
        Initializing video call...
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(${gridLayout.layout.cols}, ${gridLayout.dimensions.width}px)`,
        gridTemplateRows: `repeat(${gridLayout.layout.rows}, ${gridLayout.dimensions.height}px)`,
        gap: `${gridLayout.gap}px`,
        justifyContent: 'center',
        alignContent: 'center',
        flex: 1,
        alignItems: 'center',
        justifyItems: 'center',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden'
      }}
    >
      {participants.map((participant, index) => (
        <VideoTile
          key={participant.id}
          participant={participant}
          dimensions={gridLayout.dimensions}
          onError={(error) => handleParticipantError(participant.id, error)}
        />
      ))}
    </Box>
  );
}; 