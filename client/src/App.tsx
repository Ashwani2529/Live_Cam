import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { VideoCall } from './components/VideoCall/VideoCall';
import { ThankYouPage } from './components/ThankYou/ThankYouPage';

// Create Material-UI theme
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#2196f3',
    },
    secondary: {
      main: '#f50057',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          margin: 0,
          padding: 0,
          boxSizing: 'border-box',
          fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
          backgroundColor: '#121212',
          overflow: 'hidden'
        },
        '*': {
          boxSizing: 'border-box'
        },
        '#root': {
          width: '100vw',
          height: '100vh',
          overflow: 'hidden'
        }
      }
    }
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    }
  }
});

const App: React.FC = () => {
  const handleLeave = () => {
    console.log('User left the call');
    // Redirect to thank you page
    window.location.href = '/thank-you';
  };

  const handleError = (error: string) => {
    console.error('Video call error:', error);
    // In a real app, you might show a toast notification or error dialog
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route 
            path="/" 
            element={
              <VideoCall
                roomId="default-room"
                onLeave={handleLeave}
                onError={handleError}
              />
            } 
          />
          <Route path="/thank-you" element={<ThankYouPage />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
};

export default App; 