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
  0%, 100% { box-shadow: 0 0 20px rgba(33, 150, 243, 0.3); }
  50% { box-shadow: 0 0 40px rgba(33, 150, 243, 0.6), 0 0 60px rgba(33, 150, 243, 0.4); }
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
        background: `
          linear-gradient(-45deg, 
            #1e3c72, #2a5298, #667eea, #764ba2, 
            #f093fb, #f5576c, #4facfe, #00f2fe
          )`,
        backgroundSize: '400% 400%',
        animation: `${gradientAnimation} 15s ease infinite`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
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

      <Container maxWidth="md">
        <Fade in={showContent} timeout={1000}>
          <Paper
            elevation={24}
            sx={{
              padding: isMobile ? 4 : 6,
              textAlign: 'center',
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              animation: `${pulseGlow} 3s ease-in-out infinite`,
              position: 'relative',
              overflow: 'hidden',
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
                  radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
                  radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
                  radial-gradient(circle at 40% 80%, rgba(120, 219, 255, 0.3) 0%, transparent 50%)
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
                      width: 120,
                      height: 120,
                      borderRadius: '50%',
                      background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                      marginBottom: 3,
                      animation: `${floatingAnimation} 3s ease-in-out infinite`,
                    }}
                  >
                    <Favorite sx={{ fontSize: '60px', color: 'white' }} />
                  </Box>
                </Zoom>

                <Typography
                  variant={isMobile ? 'h3' : 'h2'}
                  component="h1"
                  sx={{
                    fontWeight: 'bold',
                    background: 'linear-gradient(45deg, #fff, #f0f0f0)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    marginBottom: 2,
                    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  }}
                >
                  Thank You! 🎉
                </Typography>

                <Typography
                  variant={isMobile ? 'h6' : 'h5'}
                  sx={{
                    color: 'rgba(255, 255, 255, 0.9)',
                    marginBottom: 4,
                    fontWeight: 300,
                    lineHeight: 1.6,
                  }}
                >
                  For joining our amazing Group Video Chat App!
                  <br />
                  We hope you had a wonderful experience connecting with others.
                </Typography>
              </Box>
            </Slide>

            <Slide direction="up" in={showButton} timeout={1000}>
              <Stack spacing={3} alignItems="center">
                {/* Rejoin Call Button - Primary Action */}
                <Zoom in={showButton} timeout={1200}>
                  <Button
                  variant="contained"
                  size="large"
                  onClick={handleRejoinCall}
                  startIcon={<Videocam />}
                  endIcon={<People />}
                  sx={{
                    background: 'linear-gradient(45deg, #4CAF50 30%, #45A049 90%)',
                    color: 'white',
                    padding: '18px 40px',
                    fontSize: '1.3rem',
                    fontWeight: 'bold',
                    borderRadius: '50px',
                    textTransform: 'none',
                    boxShadow: '0 8px 32px rgba(76, 175, 80, 0.4)',
                    transition: 'all 0.3s ease',
                    minWidth: '280px',
                    '&:hover': {
                      transform: 'translateY(-4px) scale(1.05)',
                      boxShadow: '0 12px 40px rgba(76, 175, 80, 0.6)',
                      background: 'linear-gradient(45deg, #45A049 30%, #4CAF50 90%)',
                    },
                    '&:active': {
                      transform: 'translateY(-2px) scale(1.02)',
                    },
                  }}
                                  >
                    Rejoin Group Video Call
                  </Button>
                </Zoom>

                <Typography
                  variant="body2"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontStyle: 'italic',
                    marginTop: '-8px !important',
                  }}
                >
                  Continue the conversation with friends! 🎥
                </Typography>

                {/* Portfolio Button - Secondary Action */}
                <Button
                  variant="contained"
                  size="large"
                  onClick={handlePortfolioClick}
                  endIcon={<Launch />}
                  sx={{
                    background: 'linear-gradient(45deg, #FF6B6B 30%, #FF8E53 90%)',
                    color: 'white',
                    padding: '16px 32px',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    borderRadius: '50px',
                    textTransform: 'none',
                    boxShadow: '0 8px 32px rgba(255, 107, 107, 0.4)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px) scale(1.05)',
                      boxShadow: '0 12px 40px rgba(255, 107, 107, 0.6)',
                      background: 'linear-gradient(45deg, #FF8E53 30%, #FF6B6B 90%)',
                    },
                    '&:active': {
                      transform: 'translateY(-2px) scale(1.02)',
                    },
                  }}
                >
                  View Developer's Profile
                </Button>

                <Typography
                  variant="body2"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontStyle: 'italic',
                  }}
                >
                  Click to explore more amazing projects!
                </Typography>

                {/* Social Links */}
                <Stack direction="row" spacing={2} sx={{ marginTop: 3 }}>
                  {[
                    { icon: <GitHub />, label: 'GitHub' },
                    { icon: <LinkedIn />, label: 'LinkedIn' },
                    { icon: <Email />, label: 'Email' },
                  ].map((social, index) => (
                    <Zoom in={showButton} timeout={1200 + index * 200} key={social.label}>
                      <IconButton
                        sx={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          color: 'white',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            background: 'rgba(255, 255, 255, 0.2)',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 8px 25px rgba(255, 255, 255, 0.2)',
                          },
                        }}
                        onClick={handlePortfolioClick}
                      >
                        {social.icon}
                      </IconButton>
                    </Zoom>
                  ))}
                </Stack>

                {/* Alternative Action - Start New Call */}
                <Button
                  variant="text"
                  onClick={handleBackToCall}
                  endIcon={<ArrowForward />}
                  sx={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    marginTop: 1,
                    padding: '8px 16px',
                    borderRadius: '20px',
                    textTransform: 'none',
                    fontSize: '0.9rem',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      color: 'white',
                      background: 'rgba(255, 255, 255, 0.1)',
                      transform: 'translateY(-1px)',
                    },
                  }}
                >
                  Start New Call Instead
                </Button>
              </Stack>
            </Slide>
          </Paper>
        </Fade>
      </Container>
    </Box>
  );
}; 