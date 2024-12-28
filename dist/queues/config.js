"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileQueue = exports.messageQueue = void 0;
const bull_1 = __importDefault(require("bull"));
exports.messageQueue = new bull_1.default('chat-messages', {
    redis: process.env.REDIS_URL || 'redis://localhost:6379',
    defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true
    }
});
exports.fileQueue = new bull_1.default('file-uploads', {
    redis: process.env.REDIS_URL || 'redis://localhost:6379',
    defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true
    }
});
