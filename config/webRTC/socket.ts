import { Server, Socket } from "socket.io";
import http from "http";

interface SignalPayload {
  roomId: string;
  data: any;
}

export default function configureSocket(server: http.Server): Server {
  const io = new Server(server, {
    cors: {
      origin: "*", 
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("join-room", (roomId: string) => {
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room: ${roomId}`);
    });

    socket.on("offer", (payload: SignalPayload) => {
      console.log(`Offer received for room: ${payload.roomId}`);
      socket.to(payload.roomId).emit("offer", payload.data);
    });

    socket.on("answer", (payload: SignalPayload) => {
      console.log(`Answer received for room: ${payload.roomId}`);
      socket.to(payload.roomId).emit("answer", payload.data);
    });

    socket.on("ice-candidate", (payload: SignalPayload) => {
      console.log(`ICE candidate received for room: ${payload.roomId}`);
      socket.to(payload.roomId).emit("ice-candidate", payload.data);
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}
