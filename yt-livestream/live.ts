import dotenv from 'dotenv';
import { google, youtube_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import ffmpeg from 'fluent-ffmpeg';
import { PassThrough } from 'stream';
import fs from 'fs';
import path from 'path';

dotenv.config();

interface YouTubeConfig {
  streamKey: string;
  streamUrl: string;
}

class YouTubeLiveStreamService {
  private youtube: youtube_v3.Youtube;
  private oauth2Client: OAuth2Client;

  constructor() {
    const client_id = process.env.YOUTUBE_CLIENT_ID!;
    const client_secret = process.env.YOUTUBE_CLIENT_SECRET!;
    const redirect_uris = [process.env.YOUTUBE_REDIRECT_URI!];

    this.oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    const tokens = JSON.parse(fs.readFileSync(path.join(__dirname, 'tokens.json'), 'utf-8'));
    this.oauth2Client.setCredentials(tokens);

    this.youtube = google.youtube({
      version: 'v3',
      auth: this.oauth2Client,
    });
  }

  async createStream(): Promise<{ streamKey: string, streamUrl: string, broadcastId: string, streamId: string }> {
    const broadcastResponse = await this.youtube.liveBroadcasts.insert({
      part: ["snippet", "contentDetails", "status"],
      requestBody: {
        snippet: {
          title: "Live Lecture Example",
          description: "A live stream for teaching purposes",
          scheduledStartTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        },
        status: {
          privacyStatus: "public",
          selfDeclaredMadeForKids: false,
        },
        contentDetails: {
          enableAutoStart: false,
          enableAutoStop: true,
        },
      },
    });

    const broadcastId = broadcastResponse.data.id;
    console.log(`Broadcast created: ${broadcastId}`);

    const streamResponse = await this.youtube.liveStreams.insert({
      part: ["snippet", "cdn", "status"],
      requestBody: {
        snippet: {
          title: "Live Stream Example",
        },
        cdn: {
          frameRate: "30fps",
          ingestionType: "rtmp",
          resolution: "1080p",
        },
      },
    });

    const streamId = streamResponse.data.id;
    const streamKey = streamResponse.data.cdn?.ingestionInfo?.streamName!;
    const streamUrl = streamResponse.data.cdn?.ingestionInfo?.ingestionAddress!;

    if (!broadcastId || !streamId) {
      throw new Error("Broadcast ID or Stream ID is null or undefined.");
    }

    await this.youtube.liveBroadcasts.bind({
      id: broadcastId,
      streamId: streamId,
      part: ["id", "contentDetails"]
    });
    console.log("Broadcast bound to stream.");

    return { streamKey, streamUrl, broadcastId, streamId };
  }

  public async waitForStreamToBecomeActive(streamId: string) {
    let streamStatus = await this.getStreamStatus(streamId);
    let attempts = 0;
    const maxAttempts = 60;

    while (streamStatus !== "active" && attempts < maxAttempts) {
      console.log(`Current stream status: ${streamStatus}. Waiting for stream to become active...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      streamStatus = await this.getStreamStatus(streamId);
      attempts++;
    }

    if (streamStatus !== "active") {
      throw new Error("Stream failed to become active after 5 minutes. Please ensure you are sending video data to the RTMP URL.");
    }

    console.log("Stream is active.");
  }

  public async waitForBroadcastToBeInTesting(broadcastId: string) {
    let lifeCycleStatus = await this.getBroadcastStatus(broadcastId);
    let attempts = 0;
    const maxAttempts = 60;
    while (lifeCycleStatus !== "testing"  && attempts < maxAttempts) {
      console.log(`Current broadcast lifecycle status: ${lifeCycleStatus}`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      lifeCycleStatus = await this.getBroadcastStatus(broadcastId);
      attempts++;
    }
    if (lifeCycleStatus !== "testing") {
      throw new Error("Stream failed to become testing after 5 minutes. Please ensure you are sending video data to the RTMP URL.");
    }

    console.log("Broadcast is now in testing mode.");
  }

  private async getStreamStatus(streamId: string): Promise<string> {
    try {
      const response = await this.youtube.liveStreams.list({
        part: ['status'],
        id: [streamId],
      });
      return response.data.items?.[0]?.status?.streamStatus || "unknown";
    } catch (error) {
      console.error("Error fetching stream status:", (error as Error).message);
      return "unknown";
    }
  }

  private async getBroadcastStatus(broadcastId: string): Promise<string> {
    try {
      const response = await this.youtube.liveBroadcasts.list({
        part: ["status"],
        id: [broadcastId],
      });
      return response.data.items?.[0]?.status?.lifeCycleStatus || "unknown";
    } catch (error) {
      console.error("Error fetching broadcast status:", (error as Error).message);
      return "unknown";
    }
  }

  public async transitionBroadcast(broadcastId: string, status: "testing" | "live") {
    await this.youtube.liveBroadcasts.transition({
      part: ["status"],
      broadcastStatus: status,
      id: broadcastId,
    });
  }

  public async getBroadcastDetails(broadcastId: string): Promise<string> {
    try {
      const response = await this.youtube.liveBroadcasts.list({
        part: ["snippet"],
        id: [broadcastId],
      });
      const broadcast = response.data.items?.[0];
      if (broadcast) {
        return `https://www.youtube.com/watch?v=${broadcast.id}`;
      } else {
        throw new Error("Broadcast not found.");
      }
    } catch (error) {
      console.error("Error fetching broadcast details:", (error as Error).message);
      throw error;
    }
  }
}

export { YouTubeLiveStreamService,YouTubeConfig };