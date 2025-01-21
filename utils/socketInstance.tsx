import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getSocketConnection = (): Socket => {
  if (!socket) {
    const url =
      process.env.NODE_ENV === "production"
        ? `${process.env.NEXT_PUBLIC_DOMAIN_PRODUCTION}/salesforce`
        : `${process.env.NEXT_PUBLIC_DOMAIN_LOCAL}/salesforce`;

    socket = io(url);

    // Add error handling (optional)
    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
    });
  }
  return socket;
};

export const closeSocketConnection = () => {
  if (socket) {
    socket.disconnect();
    socket = null; // Reset the instance
  }
};