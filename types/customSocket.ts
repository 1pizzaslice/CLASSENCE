import { Socket } from "socket.io";

interface User {
  _id: string;
  name: string;
}

interface CustomSocket extends Socket {
  user: User;
}

export default CustomSocket;