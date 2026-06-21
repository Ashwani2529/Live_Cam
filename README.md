# 🎥 Live Video Call - MERN Stack

A modern, real-time video calling application built with **MERN stack** (MongoDB, Express, React, Node.js) and **WebRTC** technology.

## ✨ Features

- **🎬 Real-time Video Calling** - High-quality peer-to-peer video communication
- **🎙️ Audio/Video Controls** - Toggle camera and microphone on/off
- **📱 Responsive Design** - Works seamlessly on desktop, tablet, and mobile
- **🔄 Auto-reconnection** - Handles network interruptions gracefully
- **🌐 Cross-platform** - Browser-based, no downloads required
- **⚡ Modern UI** - Material-UI components with smooth animations
- **🛡️ Type-safe** - Full TypeScript implementation
- **🔗 Socket.io** - Reliable real-time communication

## 🏗️ Architecture

### **Backend (Node.js + Express + Socket.io)**
```
server/
├── index.js              # Main server with Socket.io
├── package.json          # Server dependencies
└── .env                  # Environment variables
```

### **Frontend (React + TypeScript + Material-UI)**
```
client/
├── src/
│   ├── components/
│   │   └── VideoCall/
│   │       ├── VideoCall.tsx      # Main video call component
│   │       ├── VideoGrid.tsx      # Responsive grid layout
│   │       ├── VideoTile.tsx      # Individual video tiles
│   │       ├── Controls.tsx       # Media control buttons
│   │       └── ConnectionStatus.tsx # Connection indicator
│   ├── hooks/
│   │   └── useWebRTC.ts          # WebRTC hook with all logic
│   ├── types/
│   │   └── webrtc.ts             # TypeScript interfaces
│   ├── App.tsx                   # Main app component
│   └── index.tsx                 # React entry point
├── public/
│   └── index.html                # HTML template
├── package.json                  # Client dependencies
└── tsconfig.json                 # TypeScript config
```

## 🚀 Quick Start

### **Prerequisites**
- Node.js (v16 or higher)
- npm or yarn

### **1. Install Dependencies**
```bash
# Install root dependencies
npm install

# Install server dependencies
npm run install-server

# Install client dependencies
npm run install-client
```

### **2. Environment Setup**
Create `server/.env`:
```env
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000
```

### **3. Start Development**
```bash
# Start both server and client concurrently
npm run dev

# OR start individually:
npm run server  # Backend on http://localhost:5000
npm run client  # Frontend on http://localhost:3000
```

### **4. Open the Application**
Navigate to `http://localhost:3000` in your browser.

## 📚 Key Components Explained

### **useWebRTC Hook**
The heart of the application - manages all WebRTC logic:
- **Peer connections** - Establishes WebRTC connections between users
- **Media streams** - Handles camera/microphone access
- **Socket communication** - Coordinates signaling between peers
- **State management** - Tracks participants and connection status

### **VideoGrid Component**
Intelligent grid layout system:
- **Responsive calculations** - Adapts to screen size and participant count
- **Dynamic sizing** - Optimizes tile dimensions automatically
- **Mobile-first** - Prioritizes mobile experience

### **VideoTile Component**
Individual participant video display:
- **Stream handling** - Robust video stream assignment
- **Loading states** - Visual feedback during connection
- **Error recovery** - Automatic retry mechanisms
- **Media indicators** - Shows audio/video status

## 🛠️ Development Scripts

```bash
# Development
npm run dev              # Start both client and server
npm run server          # Start backend only
npm run client          # Start frontend only

# Production
npm run build           # Build client for production
npm start              # Start production server

# Utilities
npm run install-all     # Install all dependencies
npm test               # Run tests
```

## 🌐 Deployment

### **Backend Deployment (Render)**
1. Push your code to GitHub
2. Connect your repository to your hosting platform
3. Set environment variables:
   - `PORT=5000`
   - `CLIENT_URL=https://your-frontend-domain.com`
   - `NODE_ENV=production`

### **Frontend Deployment (Vercel/Netlify)**
1. Build the client: `cd client && npm run build`
2. Deploy the `client/build` folder
3. Set environment variable:
   - `REACT_APP_SERVER_URL=https://your-backend-domain.com`

## 🔧 Configuration

### **WebRTC Configuration**
Located in `client/src/hooks/useWebRTC.ts`:
```typescript
const WEBRTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
};
```

### **Grid Layout Settings**
Customize in `client/src/components/VideoCall/VideoGrid.tsx`:
- Tile dimensions
- Aspect ratios
- Breakpoints
- Spacing

## 🐛 Troubleshooting

### **Common Issues**

**1. Videos not showing:**
- Check camera/microphone permissions
- Ensure HTTPS in production (WebRTC requirement)
- Verify server URL configuration

**2. Connection fails:**
- Check firewall settings
- Verify STUN/TURN server configuration
- Ensure ports are open

**3. Mobile issues:**
- Check viewport meta tag
- Verify touch events work
- Test on different browsers

### **Debug Tools**
- Browser console logs (extensive logging included)
- Network tab for WebSocket connections
- WebRTC internals: `chrome://webrtc-internals/`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **WebRTC** for peer-to-peer communication
- **Socket.io** for real-time signaling
- **Material-UI** for beautiful components
- **React** for the amazing framework
- **TypeScript** for type safety

---

**Made with ❤️ using MERN Stack** 