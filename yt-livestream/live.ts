import { google, youtube_v3 } from 'googleapis';
import { GaxiosResponse , GaxiosPromise } from 'googleapis-common';
import fs from 'fs';
import dotenv from 'dotenv';
import os from 'os';
import ffmpeg from 'fluent-ffmpeg'; 
import { spawn } from 'child_process';

dotenv.config();


const inputSource = process.env.INPUT_SOURCE || 'default';
const fullRtmpUrl = process.env.RTMP_URL || 'rtmp://your.rtmp.server/live/streamkey'; 

let sourceConfig: {
  input: string;
  format: string 
};

  if (os.platform() === 'win32') {
    if (inputSource === 'screen') {
      sourceConfig = {
        input: 'video="screen-capture-recorder"', // Screen capture on Windows
        format: 'dshow',
      };
    } else {
      sourceConfig = {
        input: `video=${inputSource}`, // Webcam (or user-specified device)
        format: 'dshow',
      };
    }
  } else if (os.platform() === 'linux') {
    if (inputSource === 'screen') {
      sourceConfig = {
        input: ':0.0', // Screen capture on Linux
        format: 'x11grab',
      };
    } else {
      sourceConfig = {
        input: '/dev/video0', // Default webcam on Linux
        format: 'v4l2',
      };
    }
  } else if (os.platform() === 'darwin') {
    if (inputSource === 'screen') {
      sourceConfig = {
        input: '1:none', // Screen capture on macOS
        format: 'avfoundation',
      };
    } else {
      sourceConfig = {
        input: '0', // Default webcam on macOS
        format: 'avfoundation',
      };
    }
  } else {
    throw new Error('Unsupported operating system for FFmpeg input.');
  }
interface YouTubeConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface StreamDetails {
  broadcastId: string;
  streamId: string;
  rtmpUrl: string;
  streamKey: string;
}

interface YouTubeTokens {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

class YouTubeLiveStreamService {
  private youtube: youtube_v3.Youtube;
  private oauth2Client: any;
  private readonly maxAttempts = 60;
  private readonly pollingInterval = 5000;

  constructor(config: YouTubeConfig) {
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );
    this.loadTokens();
    this.youtube = google.youtube({
      version: 'v3',
      auth: this.oauth2Client,
    });
  }

  private async getStreamStatus(streamId: string): Promise<string> {
    try {
      type StreamParams = youtube_v3.Params$Resource$Livestreams$List;
      const params: StreamParams = {
        part: ['status'] as const,
        id: [streamId]
      };
      
      const response = await this.youtube.liveStreams.list(params);
      return response.data.items?.[0]?.status?.streamStatus || 'unknown';
    } catch (error) {
      console.error('Error fetching stream status:', (error as Error).message);
      return 'unknown';
    }
  }

  private async getBroadcastStatus(broadcastId: string): Promise<string> {
    try {
      type BroadcastParams = youtube_v3.Params$Resource$Livebroadcasts$List;
      const params: BroadcastParams = {
        part: ['status'] as const,
        id: [broadcastId]
      };
      
      const response = await this.youtube.liveBroadcasts.list(params);
      return response.data.items?.[0]?.status?.lifeCycleStatus || 'unknown';
    } catch (error) {
      console.error('Error fetching broadcast status:', (error as Error).message);
      return 'unknown';
    }
  }

  private loadTokens(): void {
    try {
      const tokens = JSON.parse(fs.readFileSync('tokens.json', 'utf-8')) as YouTubeTokens;
      this.oauth2Client.setCredentials(tokens);
      console.log('Tokens loaded successfully.');
    } catch (error) {
      console.error('Error loading tokens:', (error as Error).message);
      throw new Error('Failed to load authentication tokens');
    }
  }

  async createLiveStream(): Promise<StreamDetails> {
    try {
      const broadcastResponse = await (this.youtube.liveBroadcasts.insert({
        part: ['snippet', 'contentDetails', 'status'],
        requestBody: {
          snippet: {
            title: 'Live Lecture Example',
            description: 'A live stream for teaching purposes',
            scheduledStartTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          },
          status: {
            privacyStatus: 'public',
            selfDeclaredMadeForKids: false,
          },
          contentDetails: {
            enableAutoStart: false,
            enableAutoStop: true,
          },
        },
      }) as GaxiosPromise<youtube_v3.Schema$LiveBroadcast>);

      const broadcastId = broadcastResponse.data.id!;
      console.log(`Broadcast created: ${broadcastId}`);

      // Step 2: Create stream
      const streamResponse: GaxiosResponse<youtube_v3.Schema$LiveStream> = 
        await this.youtube.liveStreams.insert({
          part: ['snippet', 'cdn', 'status'],
          requestBody: {
            snippet: {
              title: 'Live Stream Example',
            },
            cdn: {
              frameRate: '30fps',
              ingestionType: 'rtmp',
              resolution: '1080p',
            },
          },
        });

      const streamId = streamResponse.data.id!;
      const streamDetails: StreamDetails = {
        broadcastId,
        streamId,
        rtmpUrl: streamResponse.data.cdn!.ingestionInfo!.ingestionAddress!,
        streamKey: streamResponse.data.cdn!.ingestionInfo!.streamName!,
      };

      console.log('Stream Details:', streamDetails);

      // Step 3: Bind stream to broadcast
      await this.youtube.liveBroadcasts.bind({
        part: ['id', 'contentDetails'],
        id: broadcastId,
        streamId,
      });
      console.log('Broadcast bound to stream.');

      return streamDetails;
    } catch (error) {
      console.error('Error creating live stream:', (error as Error).message);
      throw error;
    }
  }

  async waitForStreamActivation(streamId: string): Promise<void> {
    let streamStatus = await this.getStreamStatus(streamId);
    let attempts = 0;

    while (streamStatus !== 'active' && attempts < this.maxAttempts) {
      console.log(`Current stream status: ${streamStatus}. Waiting...`);
      await new Promise(resolve => setTimeout(resolve, this.pollingInterval));
      streamStatus = await this.getStreamStatus(streamId);
      attempts++;
    }

    if (streamStatus !== 'active') {
      throw new Error('Stream failed to become active after 5 minutes.');
    }
  }

  async transitionToTesting(broadcastId: string): Promise<void> {
    await this.youtube.liveBroadcasts.transition({
      part: ['status'],
      broadcastStatus: 'testing',
      id: broadcastId,
    });

    let lifeCycleStatus = await this.getBroadcastStatus(broadcastId);
    while (lifeCycleStatus !== 'testing') {
      console.log(`Current broadcast status: ${lifeCycleStatus}`);
      await new Promise(resolve => setTimeout(resolve, this.pollingInterval));
      lifeCycleStatus = await this.getBroadcastStatus(broadcastId);
    }
  }

  async goLive(broadcastId: string): Promise<void> {
    await this.youtube.liveBroadcasts.transition({
      part: ['status'],
      broadcastStatus: 'live',
      id: broadcastId,
    });
    console.log('Broadcast is now live.');
  }

async sendVideoToStream(streamDetails: StreamDetails): Promise<void> {
  try {
    const { rtmpUrl, streamKey } = streamDetails;
    const fullRtmpUrl = `${rtmpUrl}/${streamKey}`;

    console.log('Starting live video stream to:', fullRtmpUrl);

    // Stream live video from the camera or other source (e.g., webcam)
    const ffmpegCommand = ffmpeg()
    .input(sourceConfig.input)
    .inputFormat(sourceConfig.format)
    .outputOptions('-f', 'flv') // Output format must be FLV for RTMP
    .output(fullRtmpUrl)
    .videoCodec('libx264') // Video codec
    .audioCodec('aac') // Audio codec
    .audioBitrate(128) // Audio bitrate
    .videoBitrate(2000) // Video bitrate (adjust as needed)
    .on('start', commandLine => {
      console.log('FFmpeg process started:', commandLine);
    })
    .on('progress', progress => {
      console.log(`Progress: ${progress.timemark}, Frames: ${progress.frames}`);
    })
    .on('error', error => {
      console.error('FFmpeg encountered an error:', error.message);
      throw error;
    })
    .on('end', () => {
      console.log('Live streaming completed successfully.');
    });

    ffmpegCommand.run();
  } catch (error) {
    console.error('Error streaming live video:', (error as Error).message);
    throw error;
  }
}

}

// Usage
const config: YouTubeConfig = {
  clientId: process.env.YOUTUBE_CLIENT_ID!,
  clientSecret: process.env.YOUTUBE_CLIENT_SECRET!,
  redirectUri: process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3000/oauth2callback',
};

const youtubeService = new YouTubeLiveStreamService(config);
youtubeService.createLiveStream()
.then(streamDetails => {
  console.log('Stream created successfully:', streamDetails);
  return youtubeService.sendVideoToStream(streamDetails);
})
.catch(error => console.error('Failed to create stream:', error));

export { YouTubeLiveStreamService, YouTubeConfig, StreamDetails } ;