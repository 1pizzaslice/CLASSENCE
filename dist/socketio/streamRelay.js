"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// services/StreamRelayService.ts
const stream_1 = require("stream");
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
class StreamRelayService {
    constructor(youtubeService) {
        this.streamBuffer = new stream_1.PassThrough();
        this.youtubeService = youtubeService;
    }
    async startStreaming(streamDetails) {
        const { rtmpUrl, streamKey } = streamDetails;
        const fullRtmpUrl = `${rtmpUrl}/${streamKey}`;
        this.ffmpegProcess = (0, fluent_ffmpeg_1.default)()
            .input(this.streamBuffer)
            .inputFormat('webm')
            .outputFormat('flv')
            .videoCodec('libx264')
            .audioCodec('aac')
            .audioBitrate('128k')
            .videoBitrate('2500k')
            .output(fullRtmpUrl)
            .on('start', () => console.log('Started streaming to YouTube'))
            .on('error', (err) => console.error('Streaming error:', err))
            .run();
    }
    pushData(chunk) {
        this.streamBuffer.write(chunk);
    }
    stop() {
        if (this.ffmpegProcess) {
            this.ffmpegProcess.kill();
        }
        this.streamBuffer.end();
    }
}
exports.default = StreamRelayService;
