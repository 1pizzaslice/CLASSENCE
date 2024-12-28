"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const stream_1 = require("stream");
const models_1 = require("../models");
const yt_livestream_1 = require("../yt-livestream");
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const configureSocket = (io) => {
    const rooms = new Map();
    io.on("connection", (socket) => {
        const customSocket = socket;
        console.log(`Socket connected: ${socket.id}`);
        socket.on("join-room", async (roomId) => {
            if (!rooms.has(roomId)) {
                rooms.set(roomId, {
                    id: roomId
                });
            }
            const room = rooms.get(roomId);
            const lectureId = roomId.replace('lecture-', '');
            const lecture = await models_1.Lecture.findById(lectureId);
            const isTeacher = (lecture === null || lecture === void 0 ? void 0 : lecture.teacher.toString()) === customSocket.user._id.toString();
            if (isTeacher) {
                room.teacherId = customSocket.user._id;
            }
            socket.join(roomId);
            console.log(`Socket ${socket.id} joined room: ${roomId} as ${isTeacher ? 'teacher' : 'viewer'}`);
            if (room.teacherId) {
                io.to(socket.id).emit('ready-to-call');
            }
        });
        socket.on("start-streaming", async (roomId) => {
            const room = rooms.get(roomId);
            console.log('Starting streaming for room:', roomId);
            try {
                if (room && customSocket.user._id === room.teacherId) {
                    room.streamingStream = new stream_1.PassThrough();
                    const youTubeService = new yt_livestream_1.YouTubeLiveStreamService();
                    const { streamKey, streamUrl, broadcastId, streamId } = await youTubeService.createStream();
                    const url = `${streamUrl}/${streamKey}`;
                    const ffmpegCommand = (0, fluent_ffmpeg_1.default)()
                        .input(room.streamingStream)
                        .inputFormat('webm')
                        .outputOptions('-f', 'flv', '-pix_fmt', 'yuv420p', '-c:v', 'libx264', '-qp:v', '19', '-profile:v', 'high', '-tune:v', 'zerolatency', '-preset:v', 'ultrafast', '-rc:v', 'cbr_ld_hq', '-level:v', '4.2', '-r:v', '60', '-g:v', '120', '-bf:v', '3', '-refs:v', '16')
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
                        socket.disconnect();
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
                    const lecture = await models_1.Lecture.findById(roomId.replace('lecture-', ''));
                    lecture === null || lecture === void 0 ? void 0 : lecture.updateOne({ youtubeLiveStreamURL: videoUrl }).exec();
                    socket.emit('youtube-video-url', { url: videoUrl });
                }
            }
            catch (error) {
                console.log(error);
            }
        });
        socket.on("streaming-data", async (data) => {
            const room = rooms.get(data.roomId);
            if ((room === null || room === void 0 ? void 0 : room.streamingStream) && customSocket.user._id === room.teacherId) {
                const buffer = Buffer.from(new Uint8Array(data.chunk));
                console.log('Received streaming data, buffer length:', buffer.length);
                if (!room.streamingStream.destroyed && room.streamingStream.writable) {
                    room.streamingStream.write(buffer, (err) => {
                        if (err) {
                            console.error('Error writing to streamingStream:', err);
                            socket.emit('streaming-error', err.message);
                        }
                    });
                }
                else {
                    console.warn('Streaming stream is not writable');
                }
            }
        });
        socket.on("stop-streaming", async (roomId) => {
            const room = rooms.get(roomId);
            if (room && customSocket.user._id === room.teacherId) {
                try {
                    if (room.streamingStream) {
                        const lectureId = room.id.replace('lecture-', '');
                        await models_1.Lecture.findOneAndUpdate({ _id: lectureId }, { status: "Completed" });
                        room.streamingStream.end();
                    }
                    if (room.ffmpegCommand) {
                        room.ffmpegCommand.kill('SIGINT');
                    }
                }
                catch (error) {
                    console.log(error);
                }
            }
        });
        socket.on("disconnect", async () => {
            rooms.forEach(async (room) => {
                try {
                    if (room.teacherId === customSocket.user._id) {
                        const lectureId = room.id.replace('lecture-', '');
                        await models_1.Lecture.findOneAndUpdate({ _id: lectureId }, { status: "Completed" });
                        if (room.streamingStream) {
                            room.streamingStream.end();
                        }
                        if (room.ffmpegCommand) {
                            room.ffmpegCommand.kill('SIGINT');
                        }
                        room.teacherId = undefined;
                    }
                }
                catch (error) {
                    console.log(error);
                }
            });
        });
    });
};
exports.default = configureSocket;
