import { io } from "socket.io-client";

// Vite dev server proxies /socket.io to the backend (see vite.config.js).
export const socket = io("/", { autoConnect: true });
