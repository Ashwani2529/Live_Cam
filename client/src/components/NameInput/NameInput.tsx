import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Fade,
  IconButton,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Videocam,
  PersonAdd,
  ArrowForward
} from '@mui/icons-material';

interface NameInputProps {
  onNameSubmit: (name: string) => void;
}

export const NameInput: React.FC<NameInputProps> = ({ onNameSubmit }) => {
  const [name, setName] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      setIsSubmitted(true);
      setTimeout(() => {
        onNameSubmit(name.trim());
      }, 300);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        padding: { xs: 2, sm: 3 }
      }}
    >
      {/* Background decoration */}
      <Box
        sx={{
          position: 'absolute',
          top: '10%',
          left: '10%',
          opacity: 0.1,
          animation: 'float 6s ease-in-out infinite'
        }}
      >
        <Videocam sx={{ fontSize: { xs: 60, sm: 80, md: 100 }, color: 'white' }} />
      </Box>

      <Box
        sx={{
          position: 'absolute',
          bottom: '15%',
          right: '15%',
          opacity: 0.1,
          animation: 'float 4s ease-in-out infinite',
          animationDelay: '2s'
        }}
      >
        <PersonAdd sx={{ fontSize: { xs: 50, sm: 70, md: 90 }, color: 'white' }} />
      </Box>

      <Container maxWidth="sm">
        <Fade in={!isSubmitted} timeout={300}>
          <Paper
            elevation={24}
            sx={{
              padding: { xs: 3, sm: 4, md: 5 },
              textAlign: 'center',
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}
          >
            <Box sx={{ mb: 3 }}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: { xs: 80, sm: 100 },
                  height: { xs: 80, sm: 100 },
                  borderRadius: '50%',
                  background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                  marginBottom: 2,
                  animation: 'pulse 2s ease-in-out infinite'
                }}
              >
                <Videocam sx={{ fontSize: { xs: 40, sm: 50 }, color: 'white' }} />
              </Box>
            </Box>

            <Typography
              variant={isMobile ? 'h4' : 'h3'}
              component="h1"
              sx={{
                fontWeight: 'bold',
                color: 'white',
                marginBottom: 1,
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}
            >
              Join Video Call
            </Typography>

            <Typography
              variant="body1"
              sx={{
                color: 'rgba(255, 255, 255, 0.8)',
                marginBottom: 4,
                fontSize: { xs: '1rem', sm: '1.1rem' }
              }}
            >
              Please enter your name to join the group video call
            </Typography>

            <Box component="form" onSubmit={handleSubmit} sx={{ mb: 3 }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyPress={handleKeyPress}
                autoFocus
                sx={{
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    fontSize: { xs: '1rem', sm: '1.1rem' },
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#2196F3',
                    },
                  },
                  '& .MuiInputBase-input': {
                    color: 'white',
                    padding: { xs: '14px 16px', sm: '16px 20px' },
                    '&::placeholder': {
                      color: 'rgba(255, 255, 255, 0.6)',
                      opacity: 1,
                    },
                  },
                }}
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={!name.trim()}
                endIcon={<ArrowForward />}
                sx={{
                  background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                  color: 'white',
                  padding: { xs: '12px 32px', sm: '16px 40px' },
                  fontSize: { xs: '1rem', sm: '1.1rem' },
                  fontWeight: 'bold',
                  borderRadius: '50px',
                  textTransform: 'none',
                  boxShadow: '0 8px 32px rgba(33, 150, 243, 0.4)',
                  transition: 'all 0.3s ease',
                  minWidth: { xs: '200px', sm: '240px' },
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 12px 40px rgba(33, 150, 243, 0.6)',
                    background: 'linear-gradient(45deg, #21CBF3 30%, #2196F3 90%)',
                  },
                  '&:disabled': {
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: 'rgba(255, 255, 255, 0.5)',
                    transform: 'none',
                    boxShadow: 'none',
                  },
                }}
              >
                Join Call
              </Button>
            </Box>

            <Typography
              variant="caption"
              sx={{
                color: 'rgba(255, 255, 255, 0.6)',
                display: 'block'
              }}
            >
              Your name will be visible to other participants
            </Typography>
          </Paper>
        </Fade>
      </Container>

      {/* Custom animations */}
      <style>
        {`
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            25% { transform: translateY(-20px) rotate(5deg); }
            50% { transform: translateY(-10px) rotate(-5deg); }
            75% { transform: translateY(-15px) rotate(3deg); }
          }
          
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
        `}
      </style>
    </Box>
  );
}; 