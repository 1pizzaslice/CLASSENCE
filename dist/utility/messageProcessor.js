"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processFileUpload = processFileUpload;
exports.processMessage = processMessage;
const models_1 = require("../models");
const client_s3_1 = require("@aws-sdk/client-s3");
const lib_storage_1 = require("@aws-sdk/lib-storage");
const uuid_1 = require("uuid");
const s3Client = new client_s3_1.S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});
async function processFileUpload(data) {
    const fileBuffer = Buffer.from(data.fileData);
    // console.log('Uploading file:', data.fileName);
    const key = `chat-files/${(0, uuid_1.v4)()}-${data.fileName}`;
    const upload = new lib_storage_1.Upload({
        client: s3Client,
        params: {
            Bucket: process.env.AWS_S3_BUCKET_NAME,
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
async function processMessage(data) {
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
    }
    else {
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
    const updatedChat = await models_1.Chat.findOneAndUpdate(query, update, {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
    }).populate('messages.sender', 'name');
    return updatedChat;
}
