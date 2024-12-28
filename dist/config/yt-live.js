"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = void 0;
exports.Config = {
    YOUTUBE_CLIENT_ID: process.env.YOUTUBE_CLIENT_ID || '',
    YOUTUBE_CLIENT_SECRET: process.env.YOUTUBE_CLIENT_SECRET || '',
    YOUTUBE_REDIRECT_URI: process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3000/oauth2callback'
};
Object.entries(exports.Config).forEach(([key, value]) => {
    if (!value) {
        throw new Error(`Missing required config: ${key}`);
    }
});
