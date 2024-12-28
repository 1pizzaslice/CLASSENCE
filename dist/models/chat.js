"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// chat.ts
const mongoose_1 = __importDefault(require("mongoose"));
const fileSchema = new mongoose_1.default.Schema({
    url: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedAt: { type: Date, default: Date.now }
});
const messageSchema = new mongoose_1.default.Schema({
    sender: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    message: {
        type: String,
        required: false
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    isRead: {
        type: Boolean,
        default: false
    },
    file: {
        type: fileSchema,
        required: false
    }
});
const chatSchema = new mongoose_1.default.Schema({
    chatType: {
        type: String,
        required: true
    },
    participants: [{
            type: mongoose_1.default.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }],
    messages: [messageSchema],
    assignmentId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Assignment',
        required: function () {
            return this.chatType === 'assignment';
        }
    },
    userId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: function () {
            return this.chatType === 'developer';
        }
    }
}, {
    timestamps: true
});
const Chat = mongoose_1.default.model('Chat', chatSchema);
exports.default = Chat;
