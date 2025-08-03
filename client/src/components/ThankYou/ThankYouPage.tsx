import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Container,
  Paper,
  Fade,
  Slide,
  Zoom,
  useTheme,
  useMediaQuery,
  IconButton,
  Stack
} from '@mui/material';
import {
  VideoCall as VideoCallIcon,
  Star,
  Favorite,
  Launch,
  GitHub,
  LinkedIn,
  Email,
  ArrowForward,
  Celebration,
  Videocam,
  People
} from '@mui/icons-material';
import { keyframes } from '@emotion/react';
import { ParticleBackground } from './ParticleBackground';

// Stunning animations
const floatingAnimation = keyframes`
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  25% { transform: translateY(-20px) rotate(5deg); }
  50% { transform: translateY(-10px) rotate(-5deg); }
  75% { transform: translateY(-15px) rotate(3deg); }
`;

const sparkleAnimation = keyframes`
  0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
  50% { opacity: 1; transform: scale(1) rotate(180deg); }
`;

const gradientAnimation = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(100, 100, 100, 0.2); }
  50% { box-shadow: 0 0 40px rgba(150, 150, 150, 0.3), 0 0 60px rgba(120, 120, 120, 0.2); }
`;

export const ThankYouPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [showContent, setShowContent] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [sparkles, setSparkles] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Trigger animations
    setTimeout(() => setShowContent(true), 300);
    setTimeout(() => setShowButton(true), 1500);

    // Generate sparkles
    const generateSparkles = () => {
      const newSparkles = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
      }));
      setSparkles(newSparkles);
    };

    generateSparkles();
    const interval = setInterval(generateSparkles, 3000);

    // Mouse move handler for interactive effects
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const handlePortfolioClick = () => {
    window.open('https://ashwanisingh-portfolio.netlify.app', '_blank');
  };

  const handleBackToCall = () => {
    window.location.href = '/';
  };

  const handleRejoinCall = () => {
    window.location.href = '/';
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        height: isMobile ? '100vh' : 'auto',
        background: `
          linear-gradient(-45deg, 
            #0f0f0f, #1a1a1a, #2d2d2d, #3a3a3a, 
            #2c2c2c, #1e1e1e, #252525, #333333
          )`,
        backgroundSize: '400% 400%',
        animation: `${gradientAnimation} 15s ease infinite`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: isMobile ? 'auto' : 'hidden',
        padding: isMobile ? '16px' : '0',
      }}
    >
      {/* Particle Background */}
      <ParticleBackground />

      {/* Mouse follower effect */}
      <Box
        sx={{
          position: 'fixed',
          left: `${mousePosition.x}%`,
          top: `${mousePosition.y}%`,
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 70%)',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: 1000,
          transition: 'all 0.1s ease-out',
        }}
      />

      {/* Animated sparkles */}
      {sparkles.map((sparkle) => (
        <Box
          key={sparkle.id}
          sx={{
            position: 'absolute',
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
            animation: `${sparkleAnimation} 2s ease-in-out infinite`,
            animationDelay: `${Math.random() * 2}s`,
          }}
        >
          <Star sx={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px' }} />
        </Box>
      ))}

      {/* Floating background elements */}
      <Box
        sx={{
          position: 'absolute',
          top: '10%',
          left: '10%',
          animation: `${floatingAnimation} 6s ease-in-out infinite`,
          opacity: 0.1,
        }}
      >
        <VideoCallIcon sx={{ fontSize: '100px', color: 'white' }} />
      </Box>
      
      <Box
        sx={{
          position: 'absolute',
          bottom: '15%',
          right: '15%',
          animation: `${floatingAnimation} 4s ease-in-out infinite`,
          animationDelay: '2s',
          opacity: 0.1,
        }}
      >
        <Celebration sx={{ fontSize: '80px', color: 'white' }} />
      </Box>

      <Container maxWidth="md" sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: isMobile ? '100%' : 'auto',
      }}>
        <Fade in={showContent} timeout={1000}>
          <Paper
            elevation={24}
            sx={{
              padding: isMobile ? 2 : 6,
              textAlign: 'center',
              background: 'rgba(30, 30, 30, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              animation: `${pulseGlow} 3s ease-in-out infinite`,
              position: 'relative',
              overflow: 'hidden',
              width: '100%',
              maxHeight: isMobile ? '90vh' : 'none',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            {/* Animated background pattern */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: `
                  radial-gradient(circle at 20% 50%, rgba(80, 80, 80, 0.2) 0%, transparent 50%),
                  radial-gradient(circle at 80% 20%, rgba(100, 100, 100, 0.2) 0%, transparent 50%),
                  radial-gradient(circle at 40% 80%, rgba(90, 90, 90, 0.2) 0%, transparent 50%)
                `,
                zIndex: -1,
              }}
            />

            <Slide direction="down" in={showContent} timeout={800}>
              <Box>
                <Zoom in={showContent} timeout={1200}>
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: isMobile ? 80 : 120,
                      height: isMobile ? 80 : 120,
                      borderRadius: '50%',
                      background: 'linear-gradient(45deg, #4a4a4a 30%, #6a6a6a 90%)',
                      marginBottom: isMobile ? 1.5 : 3,
                      animation: `${floatingAnimation} 3s ease-in-out infinite`,
                    }}
                  >
                    <Favorite sx={{ fontSize: isMobile ? '40px' : '60px', color: 'white' }} />
                  </Box>
                </Zoom>

                <Typography
                  variant={isMobile ? 'h4' : 'h2'}
                  component="h1"
                  sx={{
                    fontWeight: 'bold',
                    background: 'linear-gradient(45deg, #ffffff, #e0e0e0)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    marginBottom: isMobile ? 1 : 2,
                    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  }}
                >
                  Thank You! 🎉
                </Typography>

                <Typography
                  variant={isMobile ? 'body1' : 'h5'}
                  sx={{
                    color: 'rgba(255, 255, 255, 0.9)',
                    marginBottom: isMobile ? 2 : 4,
                    fontWeight: 300,
                    lineHeight: 1.6,
                    fontSize: isMobile ? '1rem' : undefined,
                  }}
                >
                  For joining our amazing Group Video Chat App!
                  <br />
                  We hope you had a wonderful experience connecting with others.
                </Typography>
              </Box>
            </Slide>

            <Slide direction="up" in={showButton} timeout={1000}>
              <Stack spacing={isMobile ? 1.5 : 2} alignItems="center">
                {/* Rejoin Call Button - Primary Action */}
                <Zoom in={showButton} timeout={1200}>
                  <Button
                  variant="contained"
                  size="medium"
                  onClick={handleRejoinCall}
                  startIcon={<Videocam />}
                  endIcon={<People />}
                  sx={{
                    background: 'linear-gradient(45deg, #2d2d2d 30%, #404040 90%)',
                    color: 'white',
                    padding: isMobile ? '10px 20px' : '16px 32px',
                    fontSize: isMobile ? '0.9rem' : '1.2rem',
                    fontWeight: 'bold',
                    borderRadius: '50px',
                    textTransform: 'none',
                    boxShadow: '0 8px 32px rgba(76, 175, 80, 0.4)',
                    transition: 'all 0.3s ease',
                    minWidth: isMobile ? '180px' : '240px',
                    width: isMobile ? '100%' : 'auto',
                    maxWidth: isMobile ? '280px' : 'none',
                    '&:hover': {
                      transform: 'translateY(-4px) scale(1.05)',
                      boxShadow: '0 12px 40px rgba(76, 175, 80, 0.6)',
                      background: 'linear-gradient(45deg, #404040 30%, #2d2d2d 90%)',
                    },
                    '&:active': {
                      transform: 'translateY(-2px) scale(1.02)',
                    },
                  }}
                                  >
                    Rejoin
                  </Button>
                </Zoom>

                {/* Portfolio Button - Secondary Action */}
                <Button
                  variant="contained"
                  size="medium"
                  onClick={handlePortfolioClick}
                  endIcon={<Launch />}
                  sx={{
                    background: 'linear-gradient(45deg, #555555 30%, #757575 90%)',
                    color: 'white',
                    padding: isMobile ? '10px 20px' : '16px 32px',
                    fontSize: isMobile ? '0.85rem' : '1.1rem',
                    fontWeight: 'bold',
                    borderRadius: '50px',
                    textTransform: 'none',
                    boxShadow: '0 8px 32px rgba(255, 107, 107, 0.4)',
                    transition: 'all 0.3s ease',
                    minWidth: isMobile ? '180px' : 'auto',
                    width: isMobile ? '100%' : 'auto',
                    maxWidth: isMobile ? '280px' : 'none',
                    '&:hover': {
                      transform: 'translateY(-4px) scale(1.05)',
                      boxShadow: '0 12px 40px rgba(255, 107, 107, 0.6)',
                      background: 'linear-gradient(45deg, #757575 30%, #555555 90%)',
                    },
                    '&:active': {
                      transform: 'translateY(-2px) scale(1.02)',
                    },
                  }}
                >
                  View Developer's Profile
                </Button>
              </Stack>
            </Slide>
          </Paper>
        </Fade>
      </Container>
    </Box>
  );
}; 