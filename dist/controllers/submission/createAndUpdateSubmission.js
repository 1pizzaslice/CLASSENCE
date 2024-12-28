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
const createOrUpdateSubmission = async (req, res, next) => {
    var _a, _b, _c;
    const { assignmentId } = req.body;
    const files = req.files;
    const mediaUrls = [];
    if (!assignmentId) {
        return next(new types_1.CustomError('AssignmentId is required', 400));
    }
    try {
        const [user, assignment, submission] = await Promise.all([models_1.User.findById((_a = req.user) === null || _a === void 0 ? void 0 : _a._id), models_1.Assignment.findById(assignmentId).populate({
                path: "classroom",
                select: "teacher",
                populate: {
                    path: "teacher",
                    select: "_id",
                },
            }), models_1.Submission.findOne({ assignment: assignmentId, student: (_b = req.user) === null || _b === void 0 ? void 0 : _b._id })]);
        if (!user) {
            next(new types_1.CustomError('User not found', 404));
            return;
        }
        if (!assignment) {
            next(new types_1.CustomError('Assignment not found', 404));
            return;
        }
        if (assignment.classroom.teacher._id.toString() === user._id.toString()) {
            next(new types_1.CustomError('You cannot submit submission on your own assignment!', 403));
            return;
        }
        if (assignment.dueDate < new Date()) {
            next(new types_1.CustomError('Assignment is locked', 400));
            return;
        }
        // console.log(user.classRooms,assignment.classroom._id.toString());
        if (!user.classRooms.includes(assignment.classroom._id.toString())) {
            next(new types_1.CustomError('You are not authorized to submit in this classroom', 403));
            return;
        }
        if (submission && submission.isGraded) {
            return next(new types_1.CustomError("Assignment is already graded and cannot be updated", 403));
        }
        if (!files || files.length === 0) {
            return next(new types_1.CustomError("At least one file is required for submission", 400));
        }
        if (files && files.length > 0) {
            const uploadPromises = files.map(async (file) => {
                const key = `submission/${(0, uuid_1.v4)()}-${file.originalname}`;
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
            const resolvedUrls = (await Promise.all(uploadPromises)).filter((location) => {
                if (!location) {
                    console.error("S3 upload failed: Location is undefined.");
                }
                return location !== undefined;
            });
            mediaUrls.push(...resolvedUrls);
        }
        if (submission) {
            if (!submission.history) {
                submission.history = [];
            }
            submission.history.push({
                media: submission.media,
                timestamp: submission.updatedAt,
            });
            submission.media = mediaUrls;
            const submissionId = submission._id;
            assignment.submissions = [...(assignment.submissions || []).filter(s => s.toString() !== submissionId.toString()), submission._id];
            await submission.save();
        }
        else {
            const newSubmission = new models_1.Submission({
                assignment: assignmentId,
                student: (_c = req.user) === null || _c === void 0 ? void 0 : _c._id,
                media: mediaUrls,
            });
            await newSubmission.save();
            assignment.submissions = [...(assignment.submissions || []), newSubmission._id];
        }
        await assignment.save();
        res.status(201).json({
            success: true,
            message: 'Submission created successfully',
        });
    }
    catch (error) {
        const err = error;
        next(new types_1.CustomError("Something went wrong", 500, `${err.message}`));
    }
};
exports.default = createOrUpdateSubmission;
