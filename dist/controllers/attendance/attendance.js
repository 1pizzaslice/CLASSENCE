"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../../types");
const models_1 = require("../../models");
const moment_timezone_1 = __importDefault(require("moment-timezone"));
const Lecture_1 = require("../../models/Lecture");
const getAttendancePageData = async (req, res, next) => {
    var _a;
    const { classCode } = req.query;
    const userId = (_a = req === null || req === void 0 ? void 0 : req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!classCode || !userId) {
        next(new types_1.CustomError('ClassroomId and UserId is required', 400));
        return;
    }
    try {
        const classroom = await models_1.Classroom.findOne({ code: classCode }).populate('students', '_id name');
        if (!classroom || classroom.isDeleted) {
            next(new types_1.CustomError("Classroom Not Found", 400));
            return;
        }
        const isTeacher = classroom.teacher.toString() === userId.toString();
        const isStudent = classroom.students.some((student) => student._id.toString() === userId.toString());
        if (!isTeacher && !isStudent) {
            next(new types_1.CustomError("You are not authorized to view this class.", 403));
            return;
        }
        const lectures = await models_1.Lecture.find({ classroom: classroom._id, status: "Completed" });
        if (isTeacher) {
            let totalPresent = 0;
            let totalLectures = lectures.length * classroom.students.length;
            const lectureData = lectures.map(lecture => {
                const presentStudents = lecture.attendance.filter(att => att.status === Lecture_1.AttendanceStatus.Present);
                totalPresent += presentStudents.length;
                return {
                    title: lecture.title,
                    date: (0, moment_timezone_1.default)(lecture.startTime).tz('Asia/Kolkata').format('D MMM'),
                    time: (0, moment_timezone_1.default)(lecture.startTime).tz('Asia/Kolkata').format('hh:mm A'),
                    totalPresent: presentStudents.length,
                    dateFormatted: (0, moment_timezone_1.default)(lecture.startTime).tz('Asia/Kolkata').format('DD/MM'),
                    presentStudents: presentStudents.map(att => {
                        var _a;
                        return ({
                            name: (_a = classroom.students.find(student => student._id.toString() === att.student.toString())) === null || _a === void 0 ? void 0 : _a.name
                        });
                    })
                };
            });
            const last7Lectures = lectures.slice(-7).map(lecture => {
                const presentStudents = lecture.attendance.filter(att => att.status === Lecture_1.AttendanceStatus.Present);
                return {
                    date: (0, moment_timezone_1.default)(lecture.startTime).tz('Asia/Kolkata').format('DD/MM'),
                    attendance: presentStudents.length
                };
            });
            res.status(200).json({
                success: true,
                message: "Attendance data fetched successfully",
                totalAbsent: totalLectures - totalPresent,
                totalPresent,
                lectureData,
                last7Lectures,
                isTeacher: true,
            });
        }
        else if (isStudent) {
            let totalPresent = 0;
            let totalAbsent = 0;
            let currentStreak = 0;
            let longestStreak = 0;
            const lectureData = lectures.map(lecture => {
                const present = lecture.attendance.some(att => att.student.toString() === userId.toString() && att.status === Lecture_1.AttendanceStatus.Present);
                let attendance;
                if (present) {
                    totalPresent++;
                    currentStreak++;
                    attendance = "Present";
                    longestStreak = Math.max(longestStreak, currentStreak);
                }
                else {
                    totalAbsent++;
                    currentStreak = 0;
                    attendance = "Absent";
                }
                return {
                    title: lecture.title,
                    date: (0, moment_timezone_1.default)(lecture.startTime).tz('Asia/Kolkata').format('D MMM'),
                    time: (0, moment_timezone_1.default)(lecture.startTime).tz('Asia/Kolkata').format('hh:mm A'),
                    attendance,
                    totalPresent: lecture.attendance.filter(att => att.status === Lecture_1.AttendanceStatus.Present).length,
                    dateFormatted: (0, moment_timezone_1.default)(lecture.startTime).tz('Asia/Kolkata').format('DD/MM'),
                    presentStudents: lecture.attendance.filter(att => att.status === Lecture_1.AttendanceStatus.Present).map(att => {
                        var _a;
                        return ({
                            name: (_a = classroom.students.find(student => student._id.toString() === att.student.toString())) === null || _a === void 0 ? void 0 : _a.name
                        });
                    })
                };
            });
            const last7Lectures = lectures.slice(-7).map(lecture => {
                const present = lecture.attendance.some(att => att.student.toString() === userId.toString() && att.status === Lecture_1.AttendanceStatus.Present);
                if (!present) {
                    currentStreak = 0;
                }
                return {
                    dateFormatted: (0, moment_timezone_1.default)(lecture.startTime).tz('Asia/Kolkata').format('DD/MM'),
                    totalPresent: lecture.attendance.filter(att => att.status === Lecture_1.AttendanceStatus.Present).length
                };
            });
            res.status(200).json({
                success: true,
                message: "Attendance data fetched successfully",
                totalAbsent,
                totalPresent,
                currentStreak,
                longestStreak,
                lectureData,
                last7Lectures,
                isTeacher: false,
            });
        }
    }
    catch (error) {
        next(new types_1.CustomError('Failed to get attendance page data', 500, error.message));
    }
};
exports.default = getAttendancePageData;
