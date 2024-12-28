"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../../types");
const models_1 = require("../../models");
const fs_1 = __importDefault(require("fs"));
// import {cloudinary} from '../../config'
const lib_storage_1 = require("@aws-sdk/lib-storage");
const config_1 = require("../../config");
const uuid_1 = require("uuid");
const createAssignment = async (req, res, next) => {
    const { name, description, dueDate, code } = req.body;
    if (!name || !description || !dueDate || !req.user || !code) {
        return next(new types_1.CustomError("Name, description, dueDate, code and createdBy are required", 400));
    }
    const files = req.files;
    const mediaUrls = [];
    if (new Date(dueDate) < new Date()) {
        next(new types_1.CustomError('Due date should be greater than current date', 400));
        return;
    }
    try {
        const bucketName = process.env.AWS_S3_BUCKET_NAME;
        if (!bucketName)
            throw new types_1.CustomError("AWS S3 bucket name is not configured in environment variables.", 500);
        const [user, classroom] = await Promise.all([models_1.User.findById(req.user._id), models_1.Classroom.findOne({ code })]);
        if (!user) {
            next(new types_1.CustomError('User not found', 404));
            return;
        }
        if (!classroom || classroom.isDeleted) {
            next(new types_1.CustomError('Classroom not found', 404));
            return;
        }
        if (!user.classRooms.includes(classroom._id) || classroom.teacher.toString() !== user._id.toString()) {
            next(new types_1.CustomError('You are not authorized to create assignment in this classroom', 403));
            return;
        }
        // if (files && files.length > 0) {
        //   for (const file of files) {
        //     const result = await cloudinary.uploader.upload(file.path, {
        //       resource_type: "auto",
        //       folder: "assignments", 
        //     });
        //     mediaUrls.push(result.secure_url);
        //     try {
        //       await fs.unlink(file.path); // Asynchronous deletion of local file
        //     } catch (err) {
        //       console.error(`Failed to delete local file: ${file.path}`, err);
        //     }
        //   }
        // }
        if (files && files.length > 0) {
            const uploadPromises = files.map(async (file) => {
                const key = `assignments/${(0, uuid_1.v4)()}-${file.originalname}`;
                const upload = new lib_storage_1.Upload({
                    client: config_1.S3,
                    params: {
                        Bucket: process.env.AWS_S3_BUCKET_NAME,
                        Key: key,
                        Body: fs_1.default.createReadStream(file.path),
                        ContentType: file.mimetype,
                    },
                });
                const result = await upload.done();
                fs_1.default.unlink(file.path, () => { });
                return result.Location;
            });
            // mediaUrls.push(...(await Promise.all(uploadPromises)));
            const resolvedUrls = (await Promise.all(uploadPromises)).filter((location) => {
                if (!location) {
                    console.error("S3 upload failed: Location is undefined.");
                }
                return location !== undefined;
            });
            mediaUrls.push(...resolvedUrls);
        }
        const newAssignment = new models_1.Assignment({
            name,
            description,
            media: mediaUrls,
            dueDate,
            createdBy: req.user._id,
            classroom: classroom._id,
        });
        await Promise.all([newAssignment.save(), classroom.updateOne({ $push: { assignments: newAssignment._id } })]);
        res.status(201).json({
            success: true,
            message: "Assignment created successfully",
            assignment: newAssignment
        });
    }
    catch (error) {
        const err = error;
        next(new types_1.CustomError("Failed to create assignment", 500, `${err.message}`));
    }
};
exports.default = createAssignment;
