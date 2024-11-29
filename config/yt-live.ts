// config/index.ts
interface YouTubeConfig {
    YOUTUBE_CLIENT_ID: string;
    YOUTUBE_CLIENT_SECRET: string;
    YOUTUBE_REDIRECT_URI: string;
  }
  
  export const Config: YouTubeConfig = {
    YOUTUBE_CLIENT_ID: process.env.YOUTUBE_CLIENT_ID || '',
    YOUTUBE_CLIENT_SECRET: process.env.YOUTUBE_CLIENT_SECRET || '',
    YOUTUBE_REDIRECT_URI: process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3000/oauth2callback'
  };
  
  // Validate config at startup
  Object.entries(Config).forEach(([key, value]) => {
    if (!value) {
      throw new Error(`Missing required config: ${key}`);
    }
  });