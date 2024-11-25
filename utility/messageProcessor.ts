
import { Chat } from '../models';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { v4 as uuidv4 } from 'uuid';


const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
    }
});


export async function processFileUpload(data: {
    fileData:[],
    fileName: string;
    fileType: string;
}) {
    const fileBuffer = Buffer.from(data.fileData);
    // console.log('Uploading file:', data.fileName);

    
    const key = `chat-files/${uuidv4()}-${data.fileName}`;
    
    const upload = new Upload({
        client: s3Client,
        params: {
            Bucket: process.env.AWS_S3_BUCKET_NAME!,
            Key: key,
            Body: fileBuffer,
            ContentType: data.fileType
        }
    });

    const result = await upload.done();
    return {
        url: result.Location,
        name: data.fileName,
        type: data.fileType,
        size: fileBuffer.length
    };
}

interface MessageData {
    sender: string;
    message?: string;
    file?: {
        url: string;
        name: string;
        type: string;
        size: number;
    };
    timestamp: Date;
    isRead: boolean;
}

export async function processMessage(data: {
    message: MessageData;
    assignmentId: string;
    studentId: string;
    senderId: string;
    userId: string;
    chatType: 'assignment' | 'developer';
}) {
    // console.log('Processing message:', data);
    
    let query;
    let update;

    if (data.chatType === 'assignment') {
        query = { 
            assignmentId: data.assignmentId,
            chatType: 'assignment'
        };
        update = {
            $push: { messages: data.message },
            $addToSet: { 
                participants: { 
                    $each: [data.studentId, data.senderId] 
                } 
            }
        };
    } else {
        // console.log("ASASA")
        query = {
            userId: data.userId,
            chatType: 'developer'
        };
        update = {
            $push: { messages: data.message },
            $addToSet: { 
                participants: data.senderId 
            }
        };
    }

    const updatedChat = await Chat.findOneAndUpdate(
        query,
        update,
        { 
            new: true, 
            upsert: true,
            setDefaultsOnInsert: true
        }
    ).populate('messages.sender', 'name');

    return updatedChat;
}