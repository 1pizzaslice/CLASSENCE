"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../../types");
const models_1 = require("../../models");
const fs_1 = __importDefault(require("fs"));
const lib_storage_1 = require("@aws-sdk/lib-storage");
const config_1 = require("../../config");
const uuid_1 = require("uuid");
const client_s3_1 = require("@aws-sdk/client-s3");
const deleteS3Object = async (bucketName, key) => {
    try {
        const deleteCommand = new client_s3_1.DeleteObjectCommand({
            Bucket: bucketName,
            Key: key,
        });
        await config_1.S3.send(deleteCommand);
        console.log(`Successfully deleted ${key} from S3.`);
    }
    catch (error) {
        console.error(`Failed to delete ${key} from S3:`, error);
        throw new Error(`Error deleting S3 object: ${key}`);
    }
};
const updateAssignment = async (req, res, next) => {
    var _a;
    const { id } = req.params;
    const { name, description, dueDate } = req.body;
    const files = req.files;
    const newMediaUrls = [];
    try {
        const bucketName = process.env.AWS_S3_BUCKET_NAME;
        if (!bucketName) {
            throw new types_1.CustomError("AWS S3 bucket name is not configured in environment variables.", 500);
        }
        const assignment = await models_1.Assignment.findById(id)
            .populate({
            path: "classroom",
            select: "teacher",
            populate: {
                path: "teacher",
                select: "_id",
            },
        });
        if (!assignment) {
            return next(new types_1.CustomError("Assignment not found", 404));
        }
        if (assignment.dueDate < new Date()) {
            return next(new types_1.CustomError('Assignment is locked', 400));
        }
        if (assignment.classroom.teacher._id.toString() !== ((_a = req.user) === null || _a === void 0 ? void 0 : _a._id.toString())) {
            return next(new types_1.CustomError('You are not authorized to update this assignment', 403));
        }
        if (name)
            assignment.name = name;
        if (description)
            assignment.description = description;
        if (dueDate)
            assignment.dueDate = dueDate;
        // if (files && files.length > 0) {
        //     if (assignment.media && assignment.media.length > 0) {
        //       for (const url of assignment.media) {
        //         const publicId = url.split('/').pop()?.split('.')[0];
        //         if (publicId) {
        //           await cloudinary.uploader.destroy(`assignments/${publicId}`);
        //         }
        //       }
        //     }
        //   for (const file of files) {
        //     const result = await cloudinary.uploader.upload(file.path, {
        //       resource_type: "auto",
        //       folder: "assignments",
        //     });
        //     newMediaUrls.push(result.secure_url);
        //     try {
        //       await fs.unlink(file.path);
        //     } catch (err) {
        //       console.error(`Failed to delete local file: ${file.path}`, err);
        //     }
        //   }
        //   assignment.media = [...(assignment.media || []), ...newMediaUrls];
        // }
        if (files && files.length > 0) {
            // Delete existing media from S3
            if (assignment.media && assignment.media.length > 0) {
                const deletePromises = assignment.media.map(async (url) => {
                    const key = url.split(`${bucketName}/`)[1];
                    if (key) {
                        const deleteCommand = new client_s3_1.DeleteObjectCommand({
                            Bucket: bucketName,
                            Key: key,
                        });
                        await config_1.S3.send(deleteCommand);
                    }
                });
                await Promise.all(deletePromises);
            }
            const uploadPromises = files.map(async (file) => {
                const key = `assignments/${(0, uuid_1.v4)()}-${file.originalname}`;
                const upload = new lib_storage_1.Upload({
                    client: config_1.S3,
                    params: {
                        Bucket: bucketName,
                        Key: key,
                        Body: fs_1.default.createReadStream(file.path),
                        ContentType: file.mimetype,
                    },
                });
                const result = await upload.done();
                fs_1.default.unlink(file.path, (err) => {
                    if (err) {
                        console.error(`Failed to delete local file: ${file.path}`, err);
                    }
                });
                return result.Location;
            });
            const resolvedUrls = (await Promise.all(uploadPromises)).filter((location) => {
                if (!location) {
                    console.error("S3 upload failed: Location is undefined.");
                }
                return location !== undefined;
            });
            assignment.media = resolvedUrls;
        }
        await assignment.save();
        res.status(200).json({
            success: true,
            message: "Assignment updated successfully",
            assignment,
        });
    }
    catch (error) {
        const err = error;
        next(new types_1.CustomError("Failed to update assignment", 500, `${err.message}`));
    }
};
exports.default = updateAssignment;
