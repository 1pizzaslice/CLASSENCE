"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../../types");
const models_1 = require("../../models");
const moment_timezone_1 = __importDefault(require("moment-timezone"));
const getAssignments = async (req, res, next) => {
    var _a, _b, _c;
    const { classroomId } = req.query;
    if (!classroomId)
        return next(new types_1.CustomError("ClassroomId is required", 400));
    try {
        const classroom = await models_1.Classroom.findById(classroomId);
        if (!classroom)
            return next(new types_1.CustomError("Classroom not found", 404));
        const isTeacher = classroom.teacher.toString() === ((_a = req.user) === null || _a === void 0 ? void 0 : _a._id.toString());
        if (!isTeacher && !classroom.students.includes((_b = req.user) === null || _b === void 0 ? void 0 : _b._id)) {
            return next(new types_1.CustomError("You are not authorized to view this classroom", 403));
        }
        let assignments;
        if (isTeacher) {
            assignments = await models_1.Assignment.find({ classroom: classroomId })
                .populate({
                path: "submissions",
                select: "marks isGraded student media createdAt",
                populate: { path: "student", select: "name" },
            })
                .sort({ createdAt: -1 });
        }
        else {
            assignments = await models_1.Assignment.find({ classroom: classroomId })
                .populate({
                path: "submissions",
                select: "marks isGraded student media createdAt",
                populate: { path: "student", select: "name" },
                match: { student: (_c = req.user) === null || _c === void 0 ? void 0 : _c._id },
            })
                .sort({ createdAt: -1 });
        }
        const formattedAssignments = assignments.map(assignment => (Object.assign(Object.assign({}, assignment.toObject()), { createdAt: (0, moment_timezone_1.default)(assignment.createdAt).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'), dueDate: (0, moment_timezone_1.default)(assignment.dueDate).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'), submissions: assignment.submissions.map((submission) => {
                if (typeof submission === 'object' && submission !== null) {
                    return Object.assign(Object.assign({}, submission.toObject()), { createdAt: (0, moment_timezone_1.default)(submission.createdAt).tz('Asia/Kolkata').format('YYYY-MM-DD') });
                }
                return submission;
            }) })));
        res.status(200).json({ success: true, message: "Assignments fetched successfully", assignments: formattedAssignments });
    }
    catch (error) {
        next(new types_1.CustomError("Failed to get assignments", 500, error.message));
    }
};
exports.default = getAssignments;
