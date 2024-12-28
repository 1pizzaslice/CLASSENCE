"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.YouTubeLiveStreamService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const googleapis_1 = require("googleapis");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
class YouTubeLiveStreamService {
    constructor() {
        const client_id = process.env.YOUTUBE_CLIENT_ID;
        const client_secret = process.env.YOUTUBE_CLIENT_SECRET;
        const redirect_uris = [process.env.YOUTUBE_REDIRECT_URI];
        this.oauth2Client = new googleapis_1.google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
        const tokens = JSON.parse(fs_1.default.readFileSync(path_1.default.join(__dirname, 'tokens.json'), 'utf-8'));
        this.oauth2Client.setCredentials(tokens);
        this.youtube = googleapis_1.google.youtube({
            version: 'v3',
            auth: this.oauth2Client,
        });
    }
    async createStream() {
        var _a, _b, _c, _d;
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
        const streamKey = (_b = (_a = streamResponse.data.cdn) === null || _a === void 0 ? void 0 : _a.ingestionInfo) === null || _b === void 0 ? void 0 : _b.streamName;
        const streamUrl = (_d = (_c = streamResponse.data.cdn) === null || _c === void 0 ? void 0 : _c.ingestionInfo) === null || _d === void 0 ? void 0 : _d.ingestionAddress;
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
    async waitForStreamToBecomeActive(streamId) {
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
    async waitForBroadcastToBeInTesting(broadcastId) {
        let lifeCycleStatus = await this.getBroadcastStatus(broadcastId);
        let attempts = 0;
        const maxAttempts = 60;
        while (lifeCycleStatus !== "testing" && attempts < maxAttempts) {
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
    async getStreamStatus(streamId) {
        var _a, _b, _c;
        try {
            const response = await this.youtube.liveStreams.list({
                part: ['status'],
                id: [streamId],
            });
            return ((_c = (_b = (_a = response.data.items) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.status) === null || _c === void 0 ? void 0 : _c.streamStatus) || "unknown";
        }
        catch (error) {
            console.error("Error fetching stream status:", error.message);
            return "unknown";
        }
    }
    async getBroadcastStatus(broadcastId) {
        var _a, _b, _c;
        try {
            const response = await this.youtube.liveBroadcasts.list({
                part: ["status"],
                id: [broadcastId],
            });
            return ((_c = (_b = (_a = response.data.items) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.status) === null || _c === void 0 ? void 0 : _c.lifeCycleStatus) || "unknown";
        }
        catch (error) {
            console.error("Error fetching broadcast status:", error.message);
            return "unknown";
        }
    }
    async transitionBroadcast(broadcastId, status) {
        await this.youtube.liveBroadcasts.transition({
            part: ["status"],
            broadcastStatus: status,
            id: broadcastId,
        });
    }
    async getBroadcastDetails(broadcastId) {
        var _a;
        try {
            const response = await this.youtube.liveBroadcasts.list({
                part: ["snippet"],
                id: [broadcastId],
            });
            const broadcast = (_a = response.data.items) === null || _a === void 0 ? void 0 : _a[0];
            if (broadcast) {
                return `https://www.youtube.com/watch?v=${broadcast.id}`;
            }
            else {
                throw new Error("Broadcast not found.");
            }
        }
        catch (error) {
            console.error("Error fetching broadcast details:", error.message);
            throw error;
        }
    }
}
exports.YouTubeLiveStreamService = YouTubeLiveStreamService;
