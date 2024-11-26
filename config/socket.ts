// socket.ts
import { Server, Socket } from "socket.io";
import { CustomSocket } from '../types';
import { PassThrough } from 'stream';
import { Lecture } from "../models";
import { RecordingManager } from "../services/webRTC/recording";

interface SignalPayload {
  roomId: string;
  data: any;
}

let recordingManager: RecordingManager | null = null;

interface Room {
  id: string;
  teacherId?: string;
  students: Set<string>;
  recordingStream?: PassThrough;
}



const configureSocket = (io: Server) => {
  const rooms = new Map<string, Room>();

  io.on("connection", (socket: Socket) => {
    const customSocket = socket as CustomSocket;
    console.log(`Socket connected: ${socket.id}`);

    socket.on("join-room", async (roomId: string) => {
      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          id: roomId,
          students: new Set()
        });
      }

      const room = rooms.get(roomId)!;
      const lectureId = roomId.replace('lecture-', '');
      console.log(lectureId)
      const lecture = await  Lecture.findById(lectureId);
      const isTeacher = lecture?.teacher.toString() === customSocket.user._id.toString();

      if (isTeacher) {
        room.teacherId = socket.id;
      } else {
        room.students.add(socket.id);
      }

      socket.join(roomId);
      
      console.log(`Socket ${socket.id} joined room: ${roomId} as ${isTeacher ? 'teacher' : 'student'}`);

      if (!isTeacher && room.teacherId) {
        socket.to(room.teacherId).emit('student-joined', {
          studentId: socket.id
        });
      }
    });

    socket.on("start-recording", (roomId: string) => {
      const room = rooms.get(roomId);
      if (room && socket.id === room.teacherId) {
        room.recordingStream = new PassThrough();
        if (!recordingManager) {
          recordingManager = new RecordingManager(roomId);
          console.log(`Started recording for room: ${roomId}`);
        }

       }
    });

    socket.on("recording-data", async (data: { roomId: string, chunk: any }) => {
      const room = rooms.get(data.roomId);
      // console.log("S");
     try {
       if (room?.recordingStream && socket.id === room.teacherId) {
         const buffer = Buffer.from(data.chunk)
         // console.log("A")
         if(recordingManager){
           // console.log(buffer)
           recordingManager.pushData(buffer);
         }
         room.recordingStream.write(buffer);
         socket.to(data.roomId).emit("recording-data", data.chunk);
       }
     } catch (error) {
      console.log(error);
     }
    });

    socket.on("stop-recording", async (roomId: string) => {
      const room = rooms.get(roomId);
      try {
        if (recordingManager) {
          await recordingManager.finalize();
          recordingManager = null;
          console.log(`Stopped recording for room: ${roomId}`);
        }
      } catch (error) {
        console.log(error);
      }
      if (room && socket.id === room.teacherId) {
        try {
          if (room.recordingStream) {
            room.recordingStream.end();
          }
        } catch (error) {
          console.log(error);
        }
      }
    });

    socket.on("broadcast-offer", (payload: SignalPayload) => {
      const room = rooms.get(payload.roomId);
      if (room?.teacherId === socket.id) {
        socket.to(payload.roomId).emit("broadcast-offer", {
          data: payload.data
        });
      }
    });

    socket.on("broadcast-answer", (payload: SignalPayload) => {
      const room = rooms.get(payload.roomId);
      if (room?.teacherId) {
        socket.to(room.teacherId).emit("broadcast-answer", {
          data: payload.data
        });
      }
    });

    socket.on("ice-candidate", (payload: SignalPayload) => {
      const room = rooms.get(payload.roomId);
      if (room) {
        if (socket.id === room.teacherId) {
          socket.to(payload.roomId).emit("ice-candidate", {
            data: payload.data
          });
        } else if (room.teacherId) {
          socket.to(room.teacherId).emit("ice-candidate", {
            data: payload.data
          });
        }
      }
    });

    socket.on("disconnect",async () => {
      rooms.forEach(room =>async () => {
        if (room.teacherId === socket.id) {
          if (recordingManager) {
            await recordingManager.finalize();
            recordingManager = null;
            console.log(`Stopped recording`);
          }
          if (room.recordingStream) {
            room.recordingStream.end();
          }
          room.teacherId = undefined;
        } else {
          room.students.delete(socket.id);
        }
      });
    });
  });
};

export default configureSocket;