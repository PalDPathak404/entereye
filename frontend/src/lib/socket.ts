import { io } from "socket.io-client";

// Ensure only one socket instance exists (singleton)
export const socket = io("http://localhost:5000", {
  autoConnect: true
});
