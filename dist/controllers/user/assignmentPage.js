"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../../types");
const models_1 = require("../../models");
const moment_timezone_1 = __importDefault(require("moment-timezone"));
const assignmentPageData = async (req, res, next) => {
    var _a;
    const id = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!id) {
        next(new types_1.CustomError("User not found", 404));
        return;
    }
    try {
        const user = await models_1.User.findById(id)
            .select("name recentGrades joinedClassrooms createdClassrooms")
            .populate({
            path: "recentGrades",
            select: "assignment marks",
            populate: {
                path: "assignment",
                select: "name classroom",
            },
        })
            .populate({
            path: "createdClassrooms",
            select: "name code subject assignments teacher students",
            populate: {
                path: "assignments",
                select: "name dueDate submissions",
                populate: {
                    path: "submissions",
                    select: "isGraded",
                },
            },
        })
            .populate({
            path: "joinedClassrooms",
            select: "name code subject assignments teacher students",
            populate: {
                path: "assignments",
                select: "name dueDate submissions",
                populate: {
                    path: "submissions",
                    select: "isGraded student",
                },
            },
        });
        if (!user) {
            next(new types_1.CustomError("User not found", 404));
            return;
        }
        let totalJoinedAssignments = 0;
        let completedJoinedAssignments = 0;
        let overdueJoinedAssignments = 0;
        let dueSoonJoinedAssignments = 0;
        const allJoinedAssignments = [];
        // console.log(user.joinedClassrooms);
        const joinedClassroomsData = user.joinedClassrooms.map((classroom) => {
            const assignments = classroom.assignments;
            const totalAssignments = assignments.length;
            // console.log(assignments[0].submissions)
            const completedAssignments = assignments.filter((a) => a.submissions.some((s) => (s.student._id.toString() === id && s.isGraded === true))).length;
            const overdueAssignments = assignments.filter((a) => new Date(a.dueDate) < new Date() && !a.submissions.some((s) => s.student._id.toString() === id && s.isGraded === true)).length;
            const dueSoonAssignments = assignments.filter((a) => new Date(a.dueDate) > new Date() &&
                new Date(a.dueDate).getTime() - new Date().getTime() < 7 * 24 * 60 * 60 * 1000 &&
                !a.submissions.some((s) => s.student._id.toString() === id && s.isGraded === true) &&
                !(new Date(a.dueDate) < new Date())).length;
            if (classroom.teacher.toString() !== id.toString()) {
                totalJoinedAssignments += totalAssignments;
                completedJoinedAssignments += completedAssignments;
                overdueJoinedAssignments += overdueAssignments;
                dueSoonJoinedAssignments += dueSoonAssignments;
            }
            // console.log(assignments)
            allJoinedAssignments.push(...assignments.map((assignment) => ({
                classroom: classroom.name,
                classroomSubject: classroom.subject,
                title: assignment.name,
                dueDate: (0, moment_timezone_1.default)(assignment.dueDate).tz('Asia/Kolkata').format('MMM D, hh:mm A'),
                isGraded: assignment.submissions.some((s) => s.isGraded === true),
            })));
            return {
                classroom: classroom,
                totalAssignments,
                completedAssignments,
                overdueAssignments,
                dueSoonAssignments,
            };
        });
        let totalCreatedAssignments = 0;
        let totalCreatedSubmissions = 0;
        let completedCreatedSubmissions = 0;
        let overdueCreatedAssignments = 0;
        let dueSoonCreatedAssignments = 0;
        let completedCreatedAssignments = 0;
        const allCreatedAssignments = [];
        const createdClassroomsData = user.createdClassrooms.map((classroom) => {
            const assignments = classroom.assignments;
            const totalAssignments = assignments.length;
            const totalSubmissions = assignments.reduce((sum, assignment) => sum + assignment.submissions.length, 0);
            const completedSubmissions = assignments.reduce((sum, assignment) => sum + assignment.submissions.filter((s) => s.isGraded === true).length, 0);
            const completedAssignments = assignments.filter((a) => a.submissions.some((s) => s.isGraded === true)).length;
            const overdueAssignments = assignments.filter((a) => new Date(a.dueDate) < new Date() && !a.submissions.some((s) => s.isGraded === true)).length;
            const dueSoonAssignments = assignments.filter((a) => new Date(a.dueDate) > new Date() &&
                new Date(a.dueDate).getTime() - new Date().getTime() < 7 * 24 * 60 * 60 * 1000 &&
                !a.submissions.some((s) => s.isGraded === true) &&
                !(new Date(a.dueDate) < new Date())).length;
            totalCreatedAssignments += totalAssignments;
            totalCreatedSubmissions += totalSubmissions;
            completedCreatedSubmissions += completedSubmissions;
            overdueCreatedAssignments += overdueAssignments;
            dueSoonCreatedAssignments += dueSoonAssignments;
            completedCreatedAssignments += completedAssignments;
            allCreatedAssignments.push(...assignments.map((assignment) => ({
                classroom: classroom.name,
                classroomSubject: classroom.subject,
                title: assignment.name,
                dueDate: (0, moment_timezone_1.default)(assignment.dueDate).tz('Asia/Kolkata').format('MMM D, hh:mm A'),
                isGraded: assignment.submissions.some((s) => s.isGraded === true),
            })));
            return {
                classroom: classroom,
                totalAssignments,
                totalSubmissions,
                completedSubmissions,
                overdueAssignments,
                dueSoonAssignments,
                notCompletedSubmissions: totalSubmissions - completedSubmissions,
            };
        });
        const notCompletedCreatedSubmissions = totalCreatedSubmissions - completedCreatedSubmissions;
        res.status(200).json({
            success: true,
            message: "Assignment data fetched successfully!",
            user: {
                name: user.name,
                recentGrades: user.recentGrades,
                joinedClassrooms: {
                    totalClasses: user.joinedClassrooms.length,
                    totalAssignments: totalJoinedAssignments,
                    completedAssignments: completedJoinedAssignments,
                    overdueAssignments: overdueJoinedAssignments,
                    dueSoonAssignments: dueSoonJoinedAssignments,
                    perClassroomData: joinedClassroomsData,
                    allAssignments: allJoinedAssignments,
                },
                createdClassrooms: {
                    totalClasses: user.createdClassrooms.length,
                    totalAssignments: totalCreatedAssignments,
                    totalSubmissions: totalCreatedSubmissions,
                    completedSubmissions: completedCreatedSubmissions,
                    notCompletedSubmissions: notCompletedCreatedSubmissions,
                    perClassroomData: createdClassroomsData,
                    overdueAssignments: overdueCreatedAssignments,
                    dueSoonAssignments: dueSoonCreatedAssignments,
                    allAssignments: allCreatedAssignments,
                    completedAssignments: completedCreatedAssignments
                },
            },
        });
    }
    catch (error) {
        const err = error;
        next(new types_1.CustomError("Failed to get assignment data", 500, err.message));
    }
};
exports.default = assignmentPageData;
