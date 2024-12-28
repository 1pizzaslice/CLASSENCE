"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const models_1 = require("../../models");
const Lecture_1 = require("../../models/Lecture");
const Todo_1 = __importDefault(require("../../models/Todo"));
const types_1 = require("../../types");
const moment_timezone_1 = __importDefault(require("moment-timezone"));
const dashboardPageData = async (req, res, next) => {
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
                select: "name code subject assignments students",
                populate: {
                    path: "assignments",
                    select: "name dueDate submissions classroom",
                    populate: [
                        { path: "submissions", select: "isGraded student" },
                        { path: "classroom", select: "name subject students" }
                    ]
                },
            },
            {
                path: "createdClassrooms",
                select: "name code subject assignments students",
                populate: [
                    {
                        path: "assignments",
                        select: "name dueDate submissions classroom",
                        populate: [
                            { path: "submissions", select: "isGraded" },
                            { path: "classroom", select: "name subject students" }
                        ]
                    },
                    {
                        path: "students",
                        select: "name email",
                    },
                ],
            },
            {
                path: "recentClasses",
                select: "students teacher name subject",
                populate: {
                    path: "teacher",
                    select: "name"
                }
            }
        ]);
        if (!user) {
            next(new types_1.CustomError("User not found", 404));
            return;
        }
        const classDetails = {
            joined: user.joinedClassrooms,
            created: user.createdClassrooms,
        };
        const detailedJoinedAssignments = [];
        const detailedJoinedLectures = [];
        const detailedCreatedAssignments = [];
        const detailedCreatedLectures = [];
        let totalAttendancePerClassJoined = [];
        let totalAttendancePerClassCreated = [];
        const joinedClassPromises = classDetails.joined.map(async (classroom) => {
            // console.log(classroom);
            const lectures = await models_1.Lecture.find({ classroom: classroom._id, status: "Completed" });
            let totalUserPresent = 0;
            lectures.forEach((lecture) => {
                totalUserPresent += lecture.attendance.filter((attendance) => attendance.status === Lecture_1.AttendanceStatus.Present && attendance.student.toString() === id.toString()).length;
            });
            let averageAttendanceForUser = null;
            if (lectures.length !== 0) {
                averageAttendanceForUser = (totalUserPresent / lectures.length) * 100;
            }
            totalAttendancePerClassJoined.push({
                className: classroom.name,
                attendance: averageAttendanceForUser !== null && averageAttendanceForUser !== void 0 ? averageAttendanceForUser : 0,
                totalLectures: lectures.length,
            });
            const assignments = classroom.assignments;
            // console.log(assignments);
            // console.log("ASASAS")
            detailedJoinedAssignments.push({
                classroom: classroom.name,
                classroomSubject: classroom.subject,
                assignments: assignments.map((assignment) => ({
                    title: assignment.name,
                    dueDate: assignment.dueDate,
                    isGraded: assignment.submissions.some((submission) => {
                        const sub = submission;
                        if (sub.student.toString() !== user._id.toString())
                            return false;
                        return sub.isGraded === true;
                    }),
                })),
            });
            detailedJoinedLectures.push({
                classroom: classroom.name,
                classroomSubject: classroom.subject,
                lectures: lectures.map((lecture) => ({
                    title: lecture.title,
                    date: lecture.date,
                    attendance: lecture.attendance,
                })),
            });
        });
        const allCreatedAssignments = [];
        const allJoinedAssignments = [];
        const createdClassPromises = classDetails.created.map(async (classroom) => {
            const lectures = await models_1.Lecture.find({ classroom: classroom._id, status: "Completed" });
            let totalStudentsInClass = classroom.students.length;
            let totalPresentStudents = 0;
            lectures.forEach((lecture) => {
                totalPresentStudents += lecture.attendance.filter((attendance) => attendance.status === Lecture_1.AttendanceStatus.Present).length;
            });
            const averageAttendanceForClass = (totalPresentStudents / totalStudentsInClass) * 100;
            totalAttendancePerClassCreated.push({
                className: classroom.name,
                attendance: averageAttendanceForClass,
            });
            const assignments = classroom.assignments;
            allCreatedAssignments.push(...assignments);
            detailedCreatedAssignments.push({
                classroom: classroom.name,
                classroomSubject: classroom.subject,
                assignments: assignments.map((assignment) => ({
                    title: assignment.name,
                    dueDate: assignment.dueDate,
                    isGraded: assignment.submissions.some((submission) => {
                        const sub = submission;
                        return sub.isGraded === true;
                    }),
                })),
            });
            const upcomingLectures = await models_1.Lecture.find({ classroom: classroom._id, startTime: { $gte: new Date() } });
            detailedCreatedLectures.push({
                classroom: classroom.name,
                classroomSubject: classroom.subject,
                upcomingLectures: upcomingLectures.map((lecture) => ({
                    title: lecture.title,
                    startTime: lecture.startTime,
                })),
            });
        });
        const joinedClassAssignmentsPromises = classDetails.joined.map(async (classroom) => {
            const assignments = classroom.assignments;
            allJoinedAssignments.push(...assignments);
        });
        const userTodos = await Todo_1.default.find({ user: id });
        // console.log("ASASASAAAAsss")
        await Promise.all([...joinedClassPromises, ...createdClassPromises, ...joinedClassAssignmentsPromises]);
        const dueSoonCreatedAssignments = allCreatedAssignments
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
            .slice(0, 2);
        const detailedDueSoonCreatedAssignments = dueSoonCreatedAssignments.map((assignment) => {
            const totalSubmissions = assignment.submissions.length;
            const reviewedSubmissions = assignment.submissions.filter((submission) => {
                const sub = submission;
                return sub.isGraded === true;
            }).length;
            return {
                classroom: assignment.classroom.name,
                classroomSubject: assignment.classroom.subject,
                title: assignment.name,
                dueDate: (0, moment_timezone_1.default)(assignment.dueDate).tz('Asia/Kolkata').format('MMM D'),
                totalSubmissions,
                reviewedSubmissions,
            };
        });
        const dueSoonJoinedAssignments = allJoinedAssignments
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
            .slice(0, 2);
        const detailedDueSoonJoinedAssignments = dueSoonJoinedAssignments.map((assignment) => ({
            classroom: assignment.classroom.name,
            classroomSubject: assignment.classroom.subject,
            title: assignment.name,
            dueDate: (0, moment_timezone_1.default)(assignment.dueDate).tz('Asia/Kolkata').format('MMM D'),
        }));
        totalAttendancePerClassCreated.sort((a, b) => a.className.localeCompare(b.className));
        detailedCreatedAssignments.sort((a, b) => a.classroom.localeCompare(b.classroom)).slice(0, 3);
        res.status(200).json({
            success: true,
            message: "Dashboard data fetched successfully!",
            user: {
                name: user.name,
                email: user.email,
                createdAt: user.createdAt,
                recentClasses: user.recentClasses,
            },
            summary: {
                totalCreatedClasses: user.createdClassrooms.length,
                totalJoinedClasses: user.joinedClassrooms.length,
                totalAssignments: user.createdClassrooms.reduce((sum, classroom) => sum + (classroom.lectures ? classroom.lectures.length : 0), 0),
                totalLectures: user.createdClassrooms.reduce((sum, classroom) => sum + (classroom.lectures ? classroom.lectures.length : 0), 0),
            },
            details: {
                joined: {
                    assignments: detailedJoinedAssignments,
                    dueSoonAssignments: detailedDueSoonJoinedAssignments,
                    lectures: detailedJoinedLectures,
                    averageAttendance: totalAttendancePerClassJoined,
                },
                created: {
                    assignments: detailedCreatedAssignments,
                    dueSoonAssignments: detailedDueSoonCreatedAssignments,
                    lectures: detailedCreatedLectures,
                    averageAttendance: totalAttendancePerClassCreated,
                },
                userTodos: userTodos.map((todo) => ({
                    title: todo.title,
                    description: todo.description,
                    isCompleted: todo.isCompleted,
                })),
            },
        });
    }
    catch (error) {
        console.error("Error fetching dashboard data", error);
        next(new types_1.CustomError("Error fetching dashboard data", 500));
    }
};
exports.default = dashboardPageData;
