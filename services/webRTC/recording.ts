// recordingManager.ts
import { S3 } from "aws-sdk";
import { PassThrough } from "stream";
import { Lecture } from "../../models";
import { CustomError } from "../../types";
import ffmpeg from "fluent-ffmpeg";
import { Types } from 'mongoose';

export class RecordingManager {
    private recordingStream: PassThrough;
    private uploadPromises: Promise<any>[];
    private qualities = ["144p", "360p"];
    private transcodedStreams: Map<string, PassThrough>;
    private s3Uploads: Map<string, S3.ManagedUpload>;
    private lectureId: string;
    private isFinalized: boolean;
    private finalizationStarted: boolean;

    constructor(lectureId: string) {
        // Remove 'lecture-' prefix if present
        this.lectureId = lectureId.replace('lecture-', '');
        this.recordingStream = new PassThrough();
        this.uploadPromises = [];
        this.transcodedStreams = new Map();
        this.s3Uploads = new Map();
        this.isFinalized = false;
        this.finalizationStarted = false;
        this.initializeStreams();
    }

    private initializeStreams() {
        this.qualities.forEach(quality => {
            const outputStream = new PassThrough();
            this.transcodedStreams.set(quality, outputStream);

            ffmpeg(this.recordingStream)
                .outputFormat("webm")
                .videoCodec("libvpx")
                .audioCodec("libvorbis")
                .size(quality === "144p" ? "144x144" : "360x360")
                .on("error", (err: Error) => {
                    if (!this.finalizationStarted) {
                        console.error(`Transcoding error for ${quality}:`, err);
                    }
                })
                .pipe(outputStream);

            const upload = new S3.ManagedUpload({
                params: {
                    Bucket: process.env.AWS_S3_BUCKET_NAME!,
                    Key: `lectures/${this.lectureId}-${quality}.webm`,
                    Body: outputStream,
                    ContentType: "video/webm",
                }
            });

            this.s3Uploads.set(quality, upload);
            this.uploadPromises.push(upload.promise());
        });
    }

    public pushData(chunk: any) {
        if (this.isFinalized || this.finalizationStarted) {
            return;
        }
        
        try {
            this.recordingStream.write(chunk);
        } catch (err) {
            console.error('Error writing chunk:', err);
        }
    }

    public async finalize() {
        if (this.isFinalized || this.finalizationStarted) {
            return;
        }

        this.finalizationStarted = true;

        try {
            // Wait for any remaining data
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Gently close streams
            this.recordingStream.end();
            
            // Wait for uploads to complete
            const results = await Promise.allSettled(this.uploadPromises);
            const successfulUploads = results
                .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
                .map((r, index) => ({
                    quality: this.qualities[index],
                    url: r.value.Location
                }));

            if (successfulUploads.length === 0) {
                throw new Error('No successful uploads');
            }

            // Update lecture document using valid ObjectId
            try {
                const lecture = await Lecture.findById(
                    new Types.ObjectId(this.lectureId)
                );
                
                if (lecture) {
                    lecture.recordingsURL = successfulUploads;
                    await lecture.save();
                }
            } catch (err) {
                console.error('Error updating lecture:', err);
            }

            this.isFinalized = true;
            return successfulUploads;
        } catch (error) {
            console.error('Finalization error:', error);
            throw new CustomError("Failed to finalize recording", 500);
        } finally {
            // Cleanup streams
            this.transcodedStreams.forEach(stream => {
                try {
                    stream.end();
                } catch (err) {}
            });
        }
    }
}