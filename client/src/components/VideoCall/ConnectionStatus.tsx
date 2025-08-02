import React from 'react';
import { Box, Typography, IconButton, Chip, Tooltip } from '@mui/material';
import { 
  Refresh,
  CheckCircle,
  Warning,
  Error,
  HourglassEmpty,
  SignalWifiOff
} from '@mui/icons-material';
import { ConnectionStatus as ConnectionStatusType } from '../../types/webrtc';

interface ConnectionStatusProps {
  status: ConnectionStatusType;
  onRefresh?: () => void;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  status,
  onRefresh 
}) => {
  const getStatusIcon = () => {
    switch (status.status) {
      case 'connected':
        return <CheckCircle sx={{ fontSize: 16 }} />;
      case 'connecting':
        return <HourglassEmpty sx={{ fontSize: 16 }} />;
      case 'reconnecting':
        return <Refresh sx={{ fontSize: 16, animation: 'spin 1s linear infinite' }} />;
      case 'loading-participants':
        return <HourglassEmpty sx={{ fontSize: 16 }} />;
      case 'disconnected':
        return <SignalWifiOff sx={{ fontSize: 16 }} />;
      default:
        return <Warning sx={{ fontSize: 16 }} />;
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case 'connected':
        return 'success';
      case 'connecting':
      case 'loading-participants':
        return 'warning';
      case 'reconnecting':
        return 'info';
      case 'disconnected':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = () => {
    switch (status.status) {
      case 'connected':
        return status.participantCount !== undefined 
          ? `Connected (${status.participantCount})` 
          : 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'reconnecting':
        return 'Reconnecting...';
      case 'loading-participants':
        return 'Loading participants...';
      case 'disconnected':
        return 'Disconnected';
      default:
        return 'Unknown';
    }
  };

  const showRefreshButton = ['disconnected', 'connecting'].includes(status.status);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {/* Status Message */}
      {status.message && (
        <Tooltip title={status.message} placement="bottom">
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.875rem',
              maxWidth: 200,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: { xs: 'none', sm: 'block' }
            }}
          >
            {status.message}
          </Typography>
        </Tooltip>
      )}

      {/* Status Chip */}
      <Chip
        icon={getStatusIcon()}
        label={getStatusLabel()}
        color={getStatusColor() as any}
        size="small"
        variant="outlined"
        sx={{
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          color: 'white',
          borderColor: 'rgba(255, 255, 255, 0.3)',
          fontSize: '0.75rem',
          height: 28,
          '& .MuiChip-icon': {
            color: 'inherit'
          },
          // Animation for reconnecting state
          ...(status.status === 'reconnecting' && {
            '& .MuiChip-icon': {
              '@keyframes spin': {
                '0%': { transform: 'rotate(0deg)' },
                '100%': { transform: 'rotate(360deg)' }
              }
            }
          })
        }}
      />

      {/* Refresh Button */}
      {showRefreshButton && onRefresh && (
        <Tooltip title="Refresh connection" placement="bottom">
          <IconButton
            onClick={onRefresh}
            size="small"
            sx={{
              color: 'rgba(255, 255, 255, 0.8)',
              '&:hover': {
                color: 'white',
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              }
            }}
            aria-label="Refresh connection"
          >
            <Refresh sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}; 