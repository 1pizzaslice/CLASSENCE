import { Server, Socket } from "socket.io";
import { CustomSocket } from '../types';
import { PassThrough } from 'stream';
import { Lecture } from "../models";
import { YouTubeLiveStreamService } from '../yt-livestream';
import ffmpeg from 'fluent-ffmpeg';

interface Room {
  id: string;
  teacherId?: string;
  streamingStream?: PassThrough;
  ffmpegCommand?: ffmpeg.FfmpegCommand;
}

const configureSocket = (io: Server) => {
  const rooms = new Map<string, Room>();

  io.on("connection", (socket: Socket) => {
    const customSocket = socket as CustomSocket;
    console.log(`Socket connected: ${socket.id}`);

    socket.on("join-room", async (roomId: string) => {
      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          id: roomId
        });
      }

      const room = rooms.get(roomId)!;
      const lectureId = roomId.replace('lecture-', '');
      const lecture = await Lecture.findById(lectureId);
      const isTeacher = lecture?.teacher.toString() === customSocket.user._id.toString();

      if (isTeacher) {
        room.teacherId = customSocket.user._id;
      }

      socket.join(roomId);
      
      console.log(`Socket ${socket.id} joined room: ${roomId} as ${isTeacher ? 'teacher' : 'viewer'}`);

      if (room.teacherId) {
        io.to(socket.id).emit('ready-to-call');
      }
    });

    socket.on("start-streaming", async (roomId: string) => {
      const room = rooms.get(roomId);
      console.log('Starting streaming for room:', roomId);
      if (room && customSocket.user._id === room.teacherId) {
        room.streamingStream = new PassThrough();

        const youTubeService = new YouTubeLiveStreamService();
        const { streamKey, streamUrl, broadcastId, streamId } = await youTubeService.createStream();
        const url = `${streamUrl}/${streamKey}`;

        const ffmpegCommand = ffmpeg()
          .input(room.streamingStream)
          .inputFormat('webm')
          .outputOptions(
            '-f', 'flv',
            '-pix_fmt', 'yuv420p',
            '-c:v', 'libx264',
            '-qp:v', '19',
            '-profile:v', 'high',
            '-tune:v', 'zerolatency',
            '-preset:v', 'ultrafast',
            '-rc:v', 'cbr_ld_hq',
            '-level:v', '4.2',
            '-r:v', '60',
            '-g:v', '120',
            '-bf:v', '3',
            '-refs:v', '16'
          )
          .output(url)
          .videoCodec('libx264')
          .audioCodec('aac')
          .audioBitrate(128)
          .videoBitrate(2000)
          .on('start', commandLine => {
            console.log('FFmpeg process started:', commandLine);
          })
          .on('progress', progress => {
          })
          .on('stderr', stderrLine => {
            console.log('Stderr output:', stderrLine);
          })
          .on('error', error => {
            console.error('FFmpeg encountered an error:', error.message);
            throw error;
          })
          .on('end', () => {
            console.log('Live streaming completed successfully.');
          });

        ffmpegCommand.run();
        room.ffmpegCommand = ffmpegCommand;

        await youTubeService.waitForStreamToBecomeActive(streamId);
        await youTubeService.transitionBroadcast(broadcastId, "testing");
        console.log("Broadcast transitioned to testing.");
          await youTubeService.waitForBroadcastToBeInTesting(broadcastId);
        await youTubeService.transitionBroadcast(broadcastId, "live");
        console.log("Broadcast is now live.");
        const videoUrl = await youTubeService.getBroadcastDetails(broadcastId);
        const lecture = await Lecture.findById(roomId.replace('lecture-', ''));
        lecture?.updateOne({ youtubeLiveStreamURL: videoUrl }).exec();
        socket.emit('youtube-video-url', { url: videoUrl });
      }
    });

    socket.on("streaming-data", async (data: { roomId: string, chunk: any }) => {
      const room = rooms.get(data.roomId);
      if (room?.streamingStream && customSocket.user._id === room.teacherId) {
        const buffer = Buffer.from(new Uint8Array(data.chunk));
        console.log('Received streaming data, buffer length:', buffer.length);
                if (!room.streamingStream.destroyed && room.streamingStream.writable) {
          room.streamingStream.write(buffer, (err) => {
            if (err) {
              console.error('Error writing to streamingStream:', err);
              socket.emit('streaming-error', err.message);
            }
          });
        } else {
          console.warn('Streaming stream is not writable');
        }
      }
    });

    socket.on("stop-streaming", async (roomId: string) => {
      const room = rooms.get(roomId);
      if (room && customSocket.user._id === room.teacherId) {
        try {
          if (room.streamingStream) {
            room.streamingStream.end();
          }
          if (room.ffmpegCommand) {
            room.ffmpegCommand.kill('SIGINT');
          }
        } catch (error) {
          console.log(error);
        }
      }
    });

    socket.on("disconnect", async () => {
      rooms.forEach(room => {
        try {
          if (room.teacherId === customSocket.user._id) {
            if (room.streamingStream) {
              room.streamingStream.end();
            }
            if (room.ffmpegCommand) {
              room.ffmpegCommand.kill('SIGINT');
            }
            room.teacherId = undefined;
          }
        } catch (error) {
          console.log(error);
        }
      });
    });
  });
};

export default configureSocket;