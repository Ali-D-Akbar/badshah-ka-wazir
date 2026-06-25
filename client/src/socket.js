import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || window.__BACKEND_URL__ || '';

export const socket = io(SERVER_URL, {
  autoConnect: false,
  transports: ['websocket', 'polling']
});
