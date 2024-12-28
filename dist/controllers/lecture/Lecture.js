"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopLiveSession = exports.startLiveSession = exports.updateLecture = exports.deleteLecture = exports.getLectures = exports.createLecture = exports.markAttendance = void 0;
const types_1 = require("../../types");
const models_1 = require("../../models");
const Lecture_1 = require("../../models/Lecture");
const moment_timezone_1 = __importDefault(require("moment-timezone"));
const Lecture_2 = require("../../models/Lecture");
const createLecture = async (req, res, next) => {
    var _a, _b;
    const { title, description, startTime, code } = req.body;
    if (!title || !description || !startTime || !code) {
        return next(new types_1.CustomError("Title, description, startTime and classroom code are required", 400));
    }
    if (new Date(startTime) < new Date()) {
        return next(new types_1.CustomError("Start time must be in the future", 400));
    }
    try {
        const classroomExists = await models_1.Classroom.findOne({ code });
        if (!classroomExists) {
            return next(new types_1.CustomError("Classroom not found", 404));
        }
        if (classroomExists.teacher.toString() !== ((_a = req.user) === null || _a === void 0 ? void 0 : _a._id)) {
            return next(new types_1.CustomError("You are not authorized to create lecture in this classroom", 403));
        }
        const newLecture = new models_1.Lecture({
            title,
            description,
            startTime,
            classroom: classroomExists._id,
            teacher: (_b = req.user) === null || _b === void 0 ? void 0 : _b._id,
            status: "Scheduled"
        });
        classroomExists.lectures.push(newLecture._id);
        await Promise.all([newLecture.save(), classroomExists.save()]);
        res.status(201).json({
            success: true,
            message: "Lecture created successfully",
            newLecture
        });
    }
    catch (error) {
        next(new types_1.CustomError("Failed to create lecture", 500, error.message));
    }
};
exports.createLecture = createLecture;
const getLectures = async (req, res, next) => {
    var _a, _b, _c;
    const { code } = req.query;
    if (!code) {
        return next(new types_1.CustomError("Classroom code is required", 400));
    }
    if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a._id)) {
        return next(new types_1.CustomError("User not found", 404));
    }
    try {
        const classroom = await models_1.Classroom.findOne({ code });
        if (!classroom) {
            return next(new types_1.CustomError("Classroom not found", 404));
        }
        if (classroom.teacher.toString() !== ((_b = req.user) === null || _b === void 0 ? void 0 : _b._id) && !classroom.students.includes((_c = req.user) === null || _c === void 0 ? void 0 : _c._id)) {
            return next(new types_1.CustomError("You are not authorized to view this classroom", 403));
        }
        const allLectures = await models_1.Lecture.find({ classroom: classroom._id })
            .populate({
            path: 'teacher',
            select: 'name email',
        })
            .populate({
            path: 'classroom',
            select: 'name subject code',
        })
            .sort({ startTime: 1 });
        const futureLectures = await models_1.Lecture.find({
            classroom: classroom._id,
            status: { $ne: "Completed" }
        })
            .populate({
            path: 'teacher',
            select: 'name email',
        })
            .populate({
            path: 'classroom',
            select: 'name subject code',
        })
            .sort({ startTime: 1 });
        const formattedAllLectures = allLectures.map(lecture => (Object.assign(Object.assign({}, lecture.toObject()), { startTime: (0, moment_timezone_1.default)(lecture.startTime).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'), createdAt: (0, moment_timezone_1.default)(lecture.createdAt).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss') })));
        const formattedFutureLectures = futureLectures.map(lecture => (Object.assign(Object.assign({}, lecture.toObject()), { startTime: (0, moment_timezone_1.default)(lecture.startTime).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'), createdAt: (0, moment_timezone_1.default)(lecture.createdAt).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss') })));
        res.status(200).json({
            success: true,
            message: "Lectures fetched successfully",
            allLectures: formattedAllLectures,
            futureLectures: formattedFutureLectures
        });
    }
    catch (error) {
        next(new types_1.CustomError("Failed to get lectures", 500, error.message));
    }
};
exports.getLectures = getLectures;
const deleteLecture = async (req, res, next) => {
    var _a;
    const { lectureId } = req.query;
    if (!lectureId) {
        return next(new types_1.CustomError("LectureId is required", 400));
    }
    try {
        const lecture = await models_1.Lecture.findById(lectureId);
        if (!lecture) {
            return next(new types_1.CustomError("Lecture not found", 404));
        }
        const classroom = await models_1.Classroom.findById(lecture.classroom);
        if (!classroom) {
            return next(new types_1.CustomError("Classroom not found", 404));
        }
        if (classroom.teacher.toString() !== ((_a = req.user) === null || _a === void 0 ? void 0 : _a._id)) {
            return next(new types_1.CustomError("You are not authorized to delete this lecture", 403));
        }
        await lecture.deleteOne();
        res.status(200).json({
            success: true,
            message: "Lecture deleted successfully",
        });
    }
    catch (error) {
        next(new types_1.CustomError("Failed to delete lecture", 500, error.message));
    }
};
exports.deleteLecture = deleteLecture;
const updateLecture = async (req, res, next) => {
    var _a;
    const { title, description, startTime, status } = req.body;
    const { lectureId } = req.query;
    if (!title && !description && !startTime && !status) {
        return next(new types_1.CustomError("At least one field (title, description, startTime, status) is required", 400));
    }
    try {
        const lecture = await models_1.Lecture.findById(lectureId);
        if (!lecture) {
            return next(new types_1.CustomError("Lecture not found", 404));
        }
        const classroom = await models_1.Classroom.findById(lecture.classroom);
        if (!classroom) {
            return next(new types_1.CustomError("Classroom not found", 404));
        }
        if (classroom.teacher.toString() !== ((_a = req.user) === null || _a === void 0 ? void 0 : _a._id)) {
            return next(new types_1.CustomError("You are not authorized to update this lecture", 403));
        }
        if (title)
            lecture.title = title;
        if (description)
            lecture.description = description;
        if (startTime)
            lecture.startTime = new Date(startTime);
        if (status)
            lecture.status = status;
        await lecture.save();
        res.status(200).json({
            success: true,
            message: "Lecture updated successfully",
            updatedLecture: lecture
        });
    }
    catch (error) {
        next(new types_1.CustomError("Failed to update lecture", 500, error.message));
    }
};
exports.updateLecture = updateLecture;
const startLiveSession = async ({ req, res, next, lectureId, socketServer }) => {
    var _a;
    try {
        const lecture = await models_1.Lecture.findById(lectureId);
        if (!lecture) {
            throw new types_1.CustomError("Lecture not found", 404);
        }
        if (lecture.teacher.toString() !== ((_a = req.user) === null || _a === void 0 ? void 0 : _a._id)) {
            throw new types_1.CustomError("You are not authorized to start this lecture", 403);
        }
        // if (lecture.status !== LectureStatus.Scheduled) {
        //     throw new CustomError(`Lecture is currently ${lecture.status}`, 400);
        // }
        const roomName = `lecture-${lectureId}`;
        socketServer.to(roomName).emit("session-started", { message: "Live session has started." });
        lecture.status = Lecture_1.LectureStatus.InProgress;
        lecture.startTime = new Date();
        await lecture.save();
        console.log(`Live session started for lecture: ${lectureId}`);
        return roomName;
    }
    catch (error) {
        console.error(`Error starting live session for lecture ${lectureId}:`, error);
        throw new types_1.CustomError("Failed to start live session", 500, error.message);
    }
};
exports.startLiveSession = startLiveSession;
const stopLiveSession = async (req, res, next, lectureId, socketServer) => {
    var _a;
    try {
        const lecture = await models_1.Lecture.findById(lectureId);
        if (!lecture) {
            throw new types_1.CustomError("Lecture not found", 404);
        }
        if (lecture.teacher.toString() !== ((_a = req.user) === null || _a === void 0 ? void 0 : _a._id)) {
            throw new types_1.CustomError("You are not authorized to stop this lecture", 403);
        }
        if (lecture.status !== Lecture_1.LectureStatus.InProgress) {
            throw new types_1.CustomError(`Lecture is Currently ${lecture.status}`, 400);
        }
        const roomName = `lecture-${lectureId}`;
        socketServer.to(roomName).emit("session-ended", { message: "Live session has ended." });
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
const markAttendance = async (req, res, next) => {
    var _a;
    const { lectureId } = req.body;
    const id = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!lectureId || !id) {
        next(new types_1.CustomError("LectureId, studentId are required", 400));
        return;
    }
    try {
        const [lecture, user] = await Promise.all([models_1.Lecture.findById(lectureId), models_1.User.findById(id)]);
        if (!lecture) {
            next(new types_1.CustomError("Lecture not found", 404));
            return;
        }
        if (!user) {
            next(new types_1.CustomError("User not found", 404));
            return;
        }
        if (lecture.status !== Lecture_1.LectureStatus.InProgress || lecture.youtubeLiveStreamURL === "") {
            next(new types_1.CustomError("Lecture is not in progress", 400));
            return;
        }
        const attendanceRecord = lecture.attendance.find(record => record.student.toString() === id);
        if (attendanceRecord) {
            attendanceRecord.status = Lecture_2.AttendanceStatus.Present;
        }
        else {
            lecture.attendance.push({
                student: user._id,
                status: Lecture_2.AttendanceStatus.Present
            });
        }
        const previousLecture = await models_1.Lecture.findOne({
            classroom: lecture.classroom,
            startTime: { $lt: lecture.startTime },
            status: Lecture_1.LectureStatus.Completed
        }).sort({ startTime: -1 });
        if (previousLecture) {
            const previousAttendance = previousLecture.attendance.find(record => record.student.toString() === id);
            if (previousAttendance && previousAttendance.status === Lecture_2.AttendanceStatus.Present) {
                user.currentStreak = (user.currentStreak || 0) + 1;
                user.longestStreak = Math.max(user.longestStreak || 0, user.currentStreak);
            }
            else {
                user.currentStreak = 1;
            }
        }
        else {
            user.currentStreak = 1;
        }
        await Promise.all([lecture.save(), user.save()]);
        res.status(200).json({
            success: true,
            message: "Attendance marked successfully",
            lecture: {
                title: lecture.title,
                description: lecture.description,
                startTime: (0, moment_timezone_1.default)(lecture.startTime).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'),
                status: lecture.status,
                classroom: lecture.classroom,
                youtubeLiveStreamURL: lecture.youtubeLiveStreamURL,
            }
        });
    }
    catch (error) {
        next(new types_1.CustomError("Failed to mark attendance", 500, error.message));
    }
};
exports.markAttendance = markAttendance;
