import { io } from "socket.io-client";

export function createSocket() {
  const socketUrl = import.meta.env.VITE_SOCKET_URL;
  return io(socketUrl, {
    transports: ["websocket", "polling"]
  });
}