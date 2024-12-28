"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../../types");
const models_1 = require("../../models");
const moment_timezone_1 = __importDefault(require("moment-timezone"));
const calendarPageData = async (req, res, next) => {
    var _a;
    const id = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!id) {
        next(new types_1.CustomError("User not found", 404));
        return;
    }
    try {
        const user = await models_1.User.findById(id)
            .populate([
            {
                path: "joinedClassrooms",
                select: "name code subject assignments",
                populate: {
                    path: "assignments",
                    select: "name dueDate submissions",
                    populate: { path: "submissions", select: "isGraded" },
                },
            },
            {
                path: "createdClassrooms",
                select: "name code subject assignments students",
                populate: [
                    {
                        path: "assignments",
                        select: "name dueDate submissions",
                        populate: { path: "submissions", select: "isGraded" },
                    },
                    {
                        path: "students",
                        select: "name email",
                    },
                ],
            },
        ]);
        if (!user) {
            next(new types_1.CustomError("User not found", 404));
            return;
        }
        const detailedJoinedClassrooms = [];
        const detailedCreatedClassrooms = [];
        const classDetails = {
            joined: user.joinedClassrooms,
            created: user.createdClassrooms,
        };
        const now = new Date();
        const joinedClassPromises = classDetails.joined.map(async (classroom) => {
            const assignments = classroom.assignments;
            const upcomingAssignments = assignments.filter((assignment) => new Date(assignment.dueDate) > now);
            const upcomingLectures = await models_1.Lecture.find({ classroom: classroom._id, startTime: { $gte: now } })
                .populate("teacher classroom")
                .sort({ startTime: 1 });
            const detailedAssignments = upcomingAssignments.map((assignment) => ({
                title: assignment.name,
                dueDate: assignment.dueDate,
                formattedDueDate: (0, moment_timezone_1.default)(assignment.dueDate).tz('Asia/Kolkata').format('MMM D, hh:mm A'),
                isGraded: assignment.submissions.some((submission) => submission.isGraded === true),
            }));
            const detailedLectures = upcomingLectures.map((lecture) => ({
                title: lecture.title,
                startTime: lecture.startTime,
                formattedStartTime: (0, moment_timezone_1.default)(lecture.startTime).tz('Asia/Kolkata').format('MMM D, hh:mm A'),
            }));
            detailedJoinedClassrooms.push({
                classroom: classroom.name,
                classroomSubject: classroom.subject,
                assignments: detailedAssignments,
                lectures: detailedLectures,
            });
        });
        const createdClassPromises = classDetails.created.map(async (classroom) => {
            const assignments = classroom.assignments;
            const upcomingAssignments = assignments.filter((assignment) => new Date(assignment.dueDate) > now);
            const upcomingLectures = await models_1.Lecture.find({ classroom: classroom._id, startTime: { $gte: now } })
                .populate("teacher classroom")
                .sort({ startTime: 1 });
            const detailedAssignments = upcomingAssignments.map((assignment) => ({
                title: assignment.name,
                dueDate: assignment.dueDate,
                formattedDueDate: (0, moment_timezone_1.default)(assignment.dueDate).tz('Asia/Kolkata').format('MMM D, hh:mm A'),
                isGraded: assignment.submissions.some((submission) => submission.isGraded === true),
            }));
            const detailedLectures = upcomingLectures.map((lecture) => ({
                title: lecture.title,
                startTime: lecture.startTime,
                formattedStartTime: (0, moment_timezone_1.default)(lecture.startTime).tz('Asia/Kolkata').format('MMM D, hh:mm A'),
            }));
            detailedCreatedClassrooms.push({
                classroom: classroom.name,
                classroomSubject: classroom.subject,
                assignments: detailedAssignments,
                lectures: detailedLectures,
            });
        });
        await Promise.all([...joinedClassPromises, ...createdClassPromises]);
        res.status(200).json({
            success: true,
            message: "Calendar data fetched successfully!",
            user: {
                name: user.name,
                email: user.email,
                createdAt: user.createdAt,
                joinedClassrooms: user.joinedClassrooms.length,
                createdClassrooms: user.createdClassrooms.length,
            },
            details: {
                joined: detailedJoinedClassrooms,
                created: detailedCreatedClassrooms,
            },
        });
    }
    catch (error) {
        next(new types_1.CustomError("Error fetching calendar data", 500));
    }
};
exports.default = calendarPageData;
