import { Server } from "socket.io";
import { Lecture } from "../../models";
import { CustomError } from "../../types";
import { LectureStatus } from "../../models/Lecture";
import { Readable } from "stream";
import { S3 } from 'aws-sdk';

const s3 = new S3({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

interface StartSessionParams {
    lectureId: string;
    socketServer: Server;
}

let recordingStream: Readable | null = null;
let uploadStream: any = null;


export const startLiveSession = async ({ lectureId, socketServer }: StartSessionParams): Promise<string> => {
    try {
        const lecture = await Lecture.findById(lectureId);

        if (!lecture) {
            throw new CustomError("Lecture not found", 404);
        }

        if (lecture.status === LectureStatus.InProgress) {
            throw new CustomError("Lecture is in progress", 400);
        }

        const roomName = `lecture-${lectureId}`;
        socketServer.to(roomName).emit("session-started", { message: "Live session has started." });
        recordingStream = new Readable({
            read() {}
        });

        // Create S3 upload stream
        const fileName = `lecture-${lectureId}.mp4`;
        uploadStream = s3.upload({
            Bucket: process.env.AWS_S3_BUCKET_NAME!,
            Key: fileName,
            Body: recordingStream,
            ContentType: 'video/mp4'
        }).promise();
        console.log(`Live session started for lecture: ${lectureId}`);
        return roomName;
    } catch (error) {
        console.error(`Error starting live session for lecture ${lectureId}:`, error);
        throw new CustomError("Failed to start live session", 500, (error as Error).message);
    }
};


export const stopLiveSession = async (lectureId: string, socketServer: Server): Promise<void> => {
    try {
        const lecture = await Lecture.findById(lectureId);

        if (!lecture) {
            throw new CustomError("Lecture not found", 404);
        }

        if (lecture.status !== LectureStatus.InProgress) {
            throw new CustomError("Lecture is not currently live", 400);
        }

        const roomName = `lecture-${lectureId}`;
        socketServer.to(roomName).emit("session-ended", { message: "Live session has ended." });
        if (recordingStream) {
            recordingStream.push(null); // End the stream
            await uploadStream;
            recordingStream = null;
            uploadStream = null;
        }
        lecture.status = LectureStatus.Completed;
        await lecture.save();

        console.log(`Live session stopped and status updated to Completed for lecture: ${lectureId}`);
    } catch (error) {
        console.error(`Error stopping live session for lecture ${lectureId}:`, error);
        throw new CustomError("Failed to stop live session", 500, (error as Error).message);
    }
};
