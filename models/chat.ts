// chat.ts
import mongoose, { Document } from 'mongoose';

interface IFile {
    url: string;
    name: string;
    type: string;
    size: number;
    uploadedAt?: Date;
}

interface IMessage {
    sender: mongoose.Types.ObjectId;
    message?: string;
    timestamp: Date;
    isRead: boolean;
    file?: IFile;
}

export interface IChat extends Document {
    participants: mongoose.Types.ObjectId[];
    messages: IMessage[];
    assignmentId: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
    chatType:string;
    userId: mongoose.Types.ObjectId;
}

const fileSchema = new mongoose.Schema({
    url: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedAt: { type: Date, default: Date.now }
});

const messageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
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

const chatSchema = new mongoose.Schema({
    chatType:{
        type:String,
        required:true
    },
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],
    messages: [messageSchema],
    assignmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Assignment',
        required: function(this: any) { 
            return this.chatType === 'assignment';
        }
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: function(this: any) { 
            return this.chatType === 'developer';
        }
    }
}, {
    timestamps: true
});

const Chat = mongoose.model<IChat>('Chat', chatSchema);

export default Chat;