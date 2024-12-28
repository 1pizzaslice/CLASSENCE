"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAnnouncement = exports.editAnnouncement = exports.createAnnouncement = void 0;
const types_1 = require("../../types");
const models_1 = require("../../models");
const fs_1 = __importDefault(require("fs"));
const config_1 = require("../../config");
const lib_storage_1 = require("@aws-sdk/lib-storage");
const config_2 = require("../../config");
const uuid_1 = require("uuid");
const utility_1 = require("../../utility");
const createAnnouncement = async (req, res, next) => {
    var _a;
    const { title, description, poll, code } = req.body;
    if (!title || !description || !req.user || !code) {
        next(new types_1.CustomError('Title, description, code is required', 400));
        return;
    }
    const files = req.files;
    const mediaUrls = [];
    try {
        const data = await models_1.Classroom.aggregate([
            { $match: { code } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'students',
                    foreignField: '_id',
                    as: 'students'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'teacher',
                    foreignField: '_id',
                    as: 'teacherInfo'
                }
            },
            {
                $project: {
                    _id: 1,
                    code: 1,
                    teacher: 1,
                    teacherInfo: { _id: 1, classRooms: 1 },
                    isDeleted: 1,
                    students: { _id: 1, email: 1, name: 1, isNotificationEnabled: 1 },
                    announcements: 1
                }
            }
        ]);
        const classroom = data[0];
        // console.log(classroom);
        if (!classroom || classroom.isDeleted) {
            next(new types_1.CustomError('Classroom not found', 404));
            return;
        }
        const teacher = classroom.teacherInfo[0];
        if (!teacher) {
            next(new types_1.CustomError('Teacher not found', 404));
            return;
        }
        const isClassroomIncluded = teacher.classRooms.some((room) => room.toString() === classroom._id.toString());
        if (!isClassroomIncluded || teacher._id.toString() !== req.user._id.toString()) {
            next(new types_1.CustomError('You are not authorized to create announcements in this classroom', 403));
            return;
        }
        if (files && files.length > 0) {
            const uploadPromises = files.map(async (file) => {
                const key = `announcements/${(0, uuid_1.v4)()}-${file.originalname}`;
                const upload = new lib_storage_1.Upload({
                    client: config_2.S3,
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
            const uploadResults = await Promise.all(uploadPromises);
            mediaUrls.push(...uploadResults.filter((url) => url !== undefined));
        }
        //TODO:SENT NOTIFICATION TO STUDENTS
        const newAnnouncement = new models_1.Announcement({
            title,
            description,
            media: mediaUrls,
            poll,
            classroom: classroom._id,
            createdBy: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id
        });
        await Promise.all([
            newAnnouncement.save(),
            models_1.Classroom.findByIdAndUpdate(classroom._id, { $push: { announcements: newAnnouncement._id } }, { new: true })
        ]);
        const emailPromises = classroom.students
            .filter((student) => student.isNotificationEnabled)
            .map((student) => {
            const emailContent = `
      <p>Dear ${student.name},</p>
      <p>A new announcement has been posted in your class:</p>
      <h3>${title}</h3>
      <p>${description}</p>
      ${mediaUrls.length > 0 ? `<p>Attached Media: ${mediaUrls.join(', ')}</p>` : ''}
      <p>Check your classroom for more details.</p>
      <p>Best regards,<br>Classence Team</p>
      `;
            return (0, utility_1.sendEmail)(student.email, 'New Announcement in Your Class', emailContent);
        });
        await Promise.all(emailPromises);
        res.status(201).json({ success: true,
            message: 'Announcement created successfully',
            announcement: newAnnouncement
        });
    }
    catch (error) {
        const err = error;
        next(new types_1.CustomError('Failed to create announcement', 500, `${err.message}`));
    }
};
exports.createAnnouncement = createAnnouncement;
const editAnnouncement = async (req, res, next) => {
    var _a, _b;
    const { id } = req.params;
    const { title, description, poll, code } = req.body;
    if (!title || !description || !code) {
        next(new types_1.CustomError('Title, description, code is required', 400));
        return;
    }
    const files = req.files;
    try {
        const [user, announcement, classroom] = await Promise.all([models_1.User.findById((_a = req.user) === null || _a === void 0 ? void 0 : _a._id), models_1.Announcement.findById(id), models_1.Classroom.findOne({ code })]);
        if (!user) {
            next(new types_1.CustomError('User not found', 404));
            return;
        }
        if (!announcement) {
            next(new types_1.CustomError('Announcement not found', 404));
            return;
        }
        if (!classroom || classroom.isDeleted) {
            next(new types_1.CustomError('Classroom not found', 404));
            return;
        }
        if (!user.classRooms.includes(classroom._id) || classroom.teacher.toString() !== user._id.toString()) {
            next(new types_1.CustomError('You are not authorized to edit announcement in this classroom', 403));
            return;
        }
        if (title)
            announcement.title = title;
        if (description)
            announcement.description = description;
        if (poll)
            announcement.poll = poll;
        if (files && files.length > 0) {
            // delete old files
            for (const url of announcement.media) {
                const publicId = (_b = url.split('/').pop()) === null || _b === void 0 ? void 0 : _b.split('.')[0];
                if (publicId) {
                    await config_1.cloudinary.uploader.destroy(`announcements/${publicId}`);
                }
            }
            // upload new files
            const mediaUrls = [];
            for (const file of files) {
                const result = await config_1.cloudinary.uploader.upload(file.path, {
                    resource_type: 'auto',
                    folder: 'announcements',
                });
                mediaUrls.push(result.secure_url);
                fs_1.default.unlink(file.path, (err) => {
                    if (err)
                        console.error(`Error deleting local file: ${file.path}`, err);
                });
            }
            announcement.media = mediaUrls;
        }
        await announcement.save();
        res.status(200).json({ success: true, message: 'Announcement updated successfully', announcement });
    }
    catch (error) {
        const err = error;
        next(new types_1.CustomError('Failed to update announcement', 500, `${err.message}`));
    }
};
exports.editAnnouncement = editAnnouncement;
const deleteAnnouncement = async (req, res, next) => {
    var _a, _b;
    const { id } = req.params;
    const { code } = req.body;
    if (!code) {
        next(new types_1.CustomError('Code is required', 400));
        return;
    }
    try {
        const [user, announcement, classroom] = await Promise.all([models_1.User.findById((_a = req.user) === null || _a === void 0 ? void 0 : _a._id), models_1.Announcement.findById(id), models_1.Classroom.findOne({ code })]);
        if (!user) {
            next(new types_1.CustomError('User not found', 404));
            return;
        }
        if (!announcement) {
            next(new types_1.CustomError('Announcement not found', 404));
            return;
        }
        if (!classroom || classroom.isDeleted) {
            next(new types_1.CustomError('Classroom not found', 404));
            return;
        }
        if (!user.classRooms.includes(classroom._id) || classroom.teacher.toString() !== user._id.toString()) {
            next(new types_1.CustomError('You are not authorized to delete announcement in this classroom', 403));
            return;
        }
        if (announcement.media && announcement.media.length > 0) {
            for (const url of announcement.media) {
                const publicId = (_b = url.split('/').pop()) === null || _b === void 0 ? void 0 : _b.split('.')[0];
                if (publicId) {
                    await config_1.cloudinary.uploader.destroy(`announcements/${publicId}`);
                }
            }
        }
        await Promise.all([announcement.deleteOne(), classroom.updateOne({ $pull: { announcements: announcement._id } })]);
        res.status(200).json({ success: true, message: 'Announcement deleted successfully' });
    }
    catch (error) {
        const err = error;
        next(new types_1.CustomError('Failed to delete announcement', 500, `${err.message}`));
    }
};
exports.deleteAnnouncement = deleteAnnouncement;
