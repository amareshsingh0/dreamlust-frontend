import { io, Socket } from 'socket.io-client';
import { env } from './env';

let socket: Socket | null = null;

export function getSocket(token?: string): Socket {
  if (socket?.connected) {
    return socket;
  }

  const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  
  socket = io(backendUrl, {
    transports: ['websocket', 'polling'],
    auth: {
      token: token || localStorage.getItem('token') || undefined,
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    console.log('🔌 WebSocket connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 WebSocket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('🔌 WebSocket connection error:', error);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function updateSocketAuth(token: string) {
  if (socket) {
    socket.auth = { token };
    socket.disconnect();
    socket.connect();
  }
}
