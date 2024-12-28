"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopLiveSession = exports.startLiveSession = void 0;
const models_1 = require("../../models");
const types_1 = require("../../types");
const Lecture_1 = require("../../models/Lecture");
const stream_1 = require("stream");
const aws_sdk_1 = require("aws-sdk");
const s3 = new aws_sdk_1.S3({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});
let recordingStream = null;
let uploadStream = null;
const startLiveSession = async ({ lectureId, socketServer }) => {
    try {
        const lecture = await models_1.Lecture.findById(lectureId);
        if (!lecture) {
            throw new types_1.CustomError("Lecture not found", 404);
        }
        if (lecture.status === Lecture_1.LectureStatus.InProgress) {
            throw new types_1.CustomError("Lecture is in progress", 400);
        }
        const roomName = `lecture-${lectureId}`;
        socketServer.to(roomName).emit("session-started", { message: "Live session has started." });
        recordingStream = new stream_1.Readable({
            read() { }
        });
        // Create S3 upload stream
        const fileName = `lecture-${lectureId}.mp4`;
        uploadStream = s3.upload({
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: fileName,
            Body: recordingStream,
            ContentType: 'video/mp4'
        }).promise();
        console.log(`Live session started for lecture: ${lectureId}`);
        return roomName;
    }
    catch (error) {
        console.error(`Error starting live session for lecture ${lectureId}:`, error);
        throw new types_1.CustomError("Failed to start live session", 500, error.message);
    }
};
exports.startLiveSession = startLiveSession;
const stopLiveSession = async (lectureId, socketServer) => {
    try {
        const lecture = await models_1.Lecture.findById(lectureId);
        if (!lecture) {
            throw new types_1.CustomError("Lecture not found", 404);
        }
        if (lecture.status !== Lecture_1.LectureStatus.InProgress) {
            throw new types_1.CustomError("Lecture is not currently live", 400);
        }
        const roomName = `lecture-${lectureId}`;
        socketServer.to(roomName).emit("session-ended", { message: "Live session has ended." });
        if (recordingStream) {
            recordingStream.push(null); // End the stream
            await uploadStream;
            recordingStream = null;
            uploadStream = null;
        }
        lecture.status = Lecture_1.LectureStatus.Completed;
        await lecture.save();
        console.log(`Live session stopped and status updated to Completed for lecture: ${lectureId}`);
    }
    catch (error) {
        console.error(`Error stopping live session for lecture ${lectureId}:`, error);
        throw new types_1.CustomError("Failed to stop live session", 500, error.message);
    }
};
exports.stopLiveSession = stopLiveSession;
