import Queue from 'bull';

export const messageQueue = new Queue('chat-messages', {
  redis: process.env.REDIS_URL || 'redis://localhost:6379',
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: true
  }
});

export const fileQueue = new Queue('file-uploads', {
  redis: process.env.REDIS_URL || 'redis://localhost:6379',
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: true
  }
});

