"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../../types");
const models_1 = require("../../models");
const config_1 = require("../../config");
const client_s3_1 = require("@aws-sdk/client-s3");
// import { cloudinary } from "../../config";
const deleteAssignment = async (req, res, next) => {
    const { id, code } = req.query;
    try {
        if (!req.user) {
            return next(new types_1.CustomError("Unauthorized access", 401));
        }
        const [assignment, user, classroom] = await Promise.all([models_1.Assignment.findById(id), models_1.User.findById(req.user._id), models_1.Classroom.findOne({ code })]);
        if (!assignment) {
            return next(new types_1.CustomError("Assignment not found", 404));
        }
        if (!user) {
            return next(new types_1.CustomError('User not found', 404));
        }
        if (!classroom || classroom.isDeleted) {
            return next(new types_1.CustomError('Classroom not found', 404));
        }
        if (!user.classRooms.includes(classroom._id) || classroom.teacher.toString() !== user._id.toString()) {
            return next(new types_1.CustomError('You are not authorized to delete assignment in this classroom', 403));
        }
        // if (assignment.media && assignment.media.length > 0) {
        //   for (const url of assignment.media) {
        //     const publicId = url.split('/').pop()?.split('.')[0];
        //     if (publicId) {
        //       await cloudinary.uploader.destroy(`assignments/${publicId}`);
        //     }
        //   }
        // }
        const bucketName = process.env.AWS_S3_BUCKET_NAME;
        if (!bucketName) {
            throw new types_1.CustomError("AWS S3 bucket name is not configured in environment variables.", 500);
        }
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
        await assignment.deleteOne();
        res.status(200).json({
            success: true,
            message: "Assignment deleted successfully",
        });
    }
    catch (error) {
        const err = error;
        next(new types_1.CustomError("Failed to delete assignment", 500, err.message));
    }
};
exports.default = deleteAssignment;
