// services/StreamRelayService.ts
import { PassThrough } from 'stream';
import { YouTubeLiveStreamService } from '../yt-livestream';
import ffmpeg from 'fluent-ffmpeg';

interface StreamDetails {
    broadcastId: string;
    streamId: string;
    rtmpUrl: string;
    streamKey: string;
  }
  
  class StreamRelayService {
    private streamBuffer: PassThrough;
    private youtubeService: YouTubeLiveStreamService;
    private ffmpegProcess: any;
  
    constructor(youtubeService: YouTubeLiveStreamService) {
      this.streamBuffer = new PassThrough();
      this.youtubeService = youtubeService;
    }

  async startStreaming(streamDetails: any) {
    const { rtmpUrl, streamKey } = streamDetails;
    const fullRtmpUrl = `${rtmpUrl}/${streamKey}`;

    this.ffmpegProcess = ffmpeg()
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

  pushData(chunk: Buffer) {
    this.streamBuffer.write(chunk);
  }

  stop() {
    if (this.ffmpegProcess) {
      this.ffmpegProcess.kill();
    }
    this.streamBuffer.end();
  }
}

export default StreamRelayService;
