import { S3 } from "aws-sdk";
import { Readable } from "stream";
import { Lecture } from "../../models";
import { CustomError } from "../../types";
import ffmpeg from "fluent-ffmpeg";

const s3 = new S3({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

interface SaveRecordingParams {
    lectureId: string;
    recordingStream: Readable;
    fileName: string;
}

const transcodeAndUpload = async (lectureId: string, recordingStream: Readable, fileName: string): Promise<string[]> => {
    const lecture = await Lecture.findById(lectureId);

    if (!lecture) {
        throw new CustomError("Lecture not found", 404);
    }

    const qualities = ["144p", "360p"];
    const uploadedFiles: { quality: string; url: string }[] = [];

    try {
        for (const quality of qualities) {
            const fileNameWithQuality = `${fileName.replace(/\.webm$/, '')}-${quality}.webm`;

            // Transcoding with error handling
            const transcodedStream = ffmpeg(recordingStream)
                .outputFormat("webm")
                .videoCodec("libvpx")
                .audioCodec("libvorbis")
                .size(quality === "144p" ? "144x144" : "360x360")
                .on("error", (err) => {
                    console.error(`Error during transcoding for ${quality}:`, err);
                    throw new CustomError(`Transcoding error for quality ${quality}`, 500);
                })
                .pipe();

            // Upload to S3
            await new Promise<void>((resolve, reject) => {
                s3.upload({
                    Bucket: process.env.AWS_BUCKET_NAME!,
                    Key: `lectures/${fileNameWithQuality}`,
                    Body: transcodedStream,
                    ContentType: "video/webm",
                })
                    .on("httpUploadProgress", (progress) => {
                        console.log(`Upload Progress (${quality}): ${progress.loaded} / ${progress.total}`);
                    })
                    .send((err : Error, data: S3.ManagedUpload.SendData) => {
                        if (err) {
                            console.error(`Upload error for ${quality}:`, err);
                            reject(new CustomError(`Upload error for quality ${quality}`, 500, err.message));
                        } else {
                            console.log(`Upload complete for ${fileNameWithQuality}`);
                            uploadedFiles.push({
                                quality,
                                url: data.Location,
                            });
                            resolve();
                        }
                    });
            });
        }

        // Save URLs to the lecture document
        lecture.recordingsURL = uploadedFiles;
        await lecture.save();

        return uploadedFiles.map((file) => file.url);
    } catch (error) {
        console.error("Error during transcoding and uploading:", error);

        // Rollback partially uploaded files
        await Promise.allSettled(
            uploadedFiles.map((file) => deleteRecordingFromS3(file.url.split('/').pop()!))
        );

        throw new CustomError("Failed to upload recordings to S3", 500, (error as Error).message);
    }
};

const deleteRecordingFromS3 = async (fileName: string): Promise<void> => {
    try {
        await s3
            .deleteObject({
                Bucket: process.env.AWS_BUCKET_NAME!,
                Key: `lectures/${fileName}`,
            })
            .promise();
        console.log(`Successfully deleted recording: ${fileName}`);
    } catch (error) {
        console.error("Error deleting file from S3:", error);
        throw new CustomError("Failed to delete recording from S3", 500, (error as Error).message);
    }
};

export { transcodeAndUpload, deleteRecordingFromS3 };
