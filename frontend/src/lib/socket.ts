import { io, Socket } from 'socket.io-client';

const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

export function createSocket(): Socket {
  return io(wsUrl, {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });
}
