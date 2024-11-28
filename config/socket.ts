// socket.ts
import { Server, Socket } from "socket.io";
import { CustomSocket } from '../types';
import { PassThrough } from 'stream';
import { Lecture } from "../models";
import { RecordingManager } from "../services/webRTC/recording";
import { YouTubeLiveStreamService , YouTubeConfig } from '../yt-livestream';
import { StreamRelayService } from '../socketio/';

interface SignalPayload {
  roomId: string;
  data: any;
}

interface StreamServices {
  [key: string]: StreamRelayService;
}

let recordingManager: RecordingManager | null = null;

interface Room {
  id: string;
  teacherId?: string | null; 
  students: Set<string>;
  recordingStream?: PassThrough;
  streamService?: StreamRelayService;
}



const configureSocket = (io: Server) => {
  const rooms = new Map<string, Room>();
  const streamServices = new Map<string, StreamRelayService>();


  io.on("connection", (socket: Socket) => {
    const customSocket = socket as CustomSocket;
    console.log(`Socket connected: ${socket.id}`);

    socket.on("join-room", async () => {
      try {
        // Ensure the socket is authenticated
        if (!customSocket.user || !customSocket.user._id) {
          console.error(`[Join Room] Unauthenticated socket tried to join room. Socket ID: ${socket.id}`);
          socket.emit("join-room-error", { error: "Not authenticated" });
          return;
        }
    
        // Find a room where the user can join as a teacher or student
        let roomId: string | null = null;
        let room: Room | undefined = undefined;
    
        // Try to find a room where the user is a teacher or student
        for (let [key, value] of rooms.entries()) {
          if (value.teacherId === customSocket.user._id) {
            // If the teacher is already assigned to a room
            roomId = key;
            room = value;
            break;
          }
          if (value.students.has(customSocket.user._id)) {
            // If the student is already in the room
            roomId = key;
            room = value;
            break;
          }
        }
    
        // If no room found, create a new room for the user
        if (!roomId) {
          roomId = `lecture-${Date.now()}`; // Create a unique roomId
          room = {
            id: roomId,
            students: new Set(),
            teacherId: customSocket.user._id,
          };
          rooms.set(roomId, room);
        }
        console.log(`[Join Room] User joined room: ${roomId}`);
        if(!room) return;

        const isTeacher = room.teacherId === customSocket.user._id;
    
        // If the user is a teacher and no teacher is assigned, assign them to the room
        if (isTeacher) {
          if (!room.teacherId) {
            room.teacherId = socket.id;
            console.log(`[Join Room] Teacher assigned to room ${roomId}. Teacher socket ID: ${socket.id}`);
          } else {
            console.warn(`[Join Room] Room ${roomId} already has a teacher: ${room.teacherId}`);
            socket.emit("join-room-error", { error: "A teacher is already assigned to this room." });
            return;
          }
        } else {
          // If the user is a student, add them to the room
          room.students.add(socket.id);
          console.log(`[Join Room] Student added to room ${roomId}. Student socket ID: ${socket.id}`);
    
          // Notify the teacher if they are already in the room
          if (room.teacherId) {
            socket.to(room.teacherId).emit("student-joined", { studentId: socket.id });
            console.log(`[Join Room] Teacher notified about student joining. Teacher socket ID: ${room.teacherId}`);
          }
        }
    
        // Add the socket to the room
        socket.join(roomId);
        console.log(`[Join Room] Socket ${socket.id} successfully joined room: ${roomId} as ${isTeacher ? "teacher" : "student"}`);
      } catch (error) {
        console.error(`[Join Room] Error processing join request. Socket ID: ${socket.id}`, error);
        socket.emit("join-room-error", { error: "Failed to join room. Please try again." });
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

    socket.on("start-youtube-stream", async () => {
      try {
        // Debugging logs for all active rooms
        // console.log('Active rooms:', Array.from(rooms.entries()));
        // console.log('Socket initiating YouTube stream:', socket.id);
    
        // Check if the user is authenticated
        if (!customSocket.user) {
          socket.emit("youtube-stream-error", { error: "Not authenticated" });
          return;
        }
    
        // Find the room where the current socket is the teacher
        const roomEntry = Array.from(rooms.entries()).find(([_, room]) => room.teacherId === customSocket.user?._id);
    
        if (!roomEntry) {
          console.error('No room found for the teacher socket:', socket.id);
          socket.emit("youtube-stream-error", { error: "Teacher not found in any room" });
          return;
        }
    
        const [roomId, room] = roomEntry;
        console.log('Teacher room found:', { roomId, teacherId: room.teacherId });
    
        console.log("Initializing YouTube stream for room:", roomId);
    
        // Validate YouTube API configuration
        if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_CLIENT_SECRET) {
          console.error("Missing YouTube API configuration in environment variables.");
          socket.emit("youtube-stream-error", { error: "YouTube API configuration missing" });
          return;
        }
    
        // Set up YouTube live stream configuration
        const config: YouTubeConfig = {
          clientId: process.env.YOUTUBE_CLIENT_ID!,
          clientSecret: process.env.YOUTUBE_CLIENT_SECRET!,
          redirectUri: process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3000/oauth2callback',
        };
    
        const youtubeService = new YouTubeLiveStreamService(config);
    
        // Create a YouTube live stream
        const streamDetails = await youtubeService.createLiveStream();
        console.log("YouTube live stream created successfully:", streamDetails);
    
        // Start relaying the video stream
        const relayService = new StreamRelayService(youtubeService);
        await relayService.startStreaming(streamDetails);
    
        // Map the relay service to the teacher's socket
        streamServices.set(socket.id, relayService);
    
        // Notify the teacher that the YouTube stream has started
        socket.emit("youtube-stream-started", { streamDetails });
    
      } catch (error) {
        // Log the error for debugging
        console.error("Error starting YouTube stream:", error);
    
        // Notify the socket about the error
        socket.emit("youtube-stream-error", {
          error: error instanceof Error ? error.message : "An unknown error occurred",
        });
      }
    });
    

    socket.on("stream-video-chunk", async (chunk: Buffer) => {
      try {
        // Retrieve relay service for the current socket
        const relayService = streamServices.get(socket.id);
    
        if (!relayService) {
          console.error(`Relay service not found for socket: ${socket.id}`);
          socket.emit("stream-error", { error: "Streaming service not initialized" });
          return;
        }
    
        // Push the video chunk to the relay service
        relayService.pushData(chunk);
      } catch (error) {
        console.error("Error relaying stream for socket:", socket.id, error);
        socket.emit("stream-error", { error: "Failed to relay stream. Please try again." });
      }
    });
    

    socket.on("stop-youtube-stream", () => {
      const relayService = streamServices.get(socket.id);
      if (relayService) {
        relayService.stop();
        streamServices.delete(socket.id);
      }
    });

    socket.on("disconnect", () => {
      const relayService = streamServices.get(socket.id);
      if (relayService) {
        relayService.stop();
        streamServices.delete(socket.id);
      }
    });

  });
};

export default configureSocket;