import { Server, Socket } from "socket.io";
import { CustomSocket } from '../types';

const configureSocket = (io: Server) => {

const userIdToSocketIdMap = new Map();
const socketIdToUserMap = new Map();

io.on("connection", (socket:Socket) => {
  const customSocket = socket as CustomSocket;
  console.log(`Socket Connected`, socket.id);
  socket.on("room:join", (data) => {
    const { userToCallId } = data;
    const myId = customSocket.user._id;
    userIdToSocketIdMap.set(myId, socket.id);
    socketIdToUserMap.set(socket.id, myId);
    const room1 = `${myId}-${userToCallId}`;
    const room2 = `${userToCallId}-${myId}`;
    let room;
    // console.log(io.sockets.adapter.rooms);
    // console.log(room1, room2);
    if (io.sockets.adapter.rooms.get(room1)) {
      room = room1;
    } else if (io.sockets.adapter.rooms.get(room2)) {
      room = room2;
    } else {
      room = room1; 
    }
    const roomSize = io.sockets.adapter.rooms.get(room)?.size || 0;
      if (roomSize >= 2) {
        socket.emit('room-full', { message: 'Room is full' });
        return;
      }

    io.to(room).emit("user:joined", { room, id: socket.id });
    socket.join(room);
    io.to(socket.id).emit("room:join", {room, id: socket.id});
  });

  socket.on("user:call", ({ to, offer }) => {
    io.to(to).emit("incomming:call", { from: socket.id, offer });
  });

  socket.on("call:accepted", ({ to, ans }) => {
    io.to(to).emit("call:accepted", { from: socket.id, ans });
  });

  socket.on("peer:nego:needed", ({ to, offer }) => {
    // console.log("peer:nego:needed", offer);
    io.to(to).emit("peer:nego:needed", { from: socket.id, offer });
  });

  socket.on("peer:nego:done", ({ to, ans }) => {
    // console.log("peer:nego:done", ans);
    io.to(to).emit("peer:nego:final", { from: socket.id, ans });
  });
  socket.on("disconnect", () => {
    const userId = socketIdToUserMap.get(socket.id);
    userIdToSocketIdMap.delete(userId);
    socketIdToUserMap.delete(socket.id);
    console.log(`Socket disconnected: ${socket.id}`);
  });
});
};

export default configureSocket;