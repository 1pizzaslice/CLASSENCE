"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../../types");
const models_1 = require("../../models");
const gradeSubmission = async (req, res, next) => {
    const { submissionId, marks } = req.body;
    if (!submissionId || !req.user || !marks) {
        return next(new types_1.CustomError('SubmissionId and marks are required', 400));
    }
    if (isNaN(marks) || marks < 0 || marks > 100) {
        return next(new types_1.CustomError('Invalid Marks', 400));
    }
    try {
        const [user, submission] = await Promise.all([models_1.User.findById(req.user._id), models_1.Submission.findById(submissionId)
                .select("assignment isGraded student marks")
                .populate({
                path: "assignment",
                select: "classroom name",
                populate: {
                    path: "classroom",
                    select: "teacher",
                }
            })
        ]);
        const student = await models_1.User.findById(submission.student);
        if (!user) {
            next(new types_1.CustomError('User not found', 404));
            return;
        }
        if (!student) {
            next(new types_1.CustomError('Student not found', 404));
            return;
        }
        if (!submission) {
            next(new types_1.CustomError('Submission not found', 404));
            return;
        }
        if (submission.assignment.classroom.teacher.toString() !== user._id.toString()) {
            next(new types_1.CustomError('You are not authorized to grade this submission', 403));
            return;
        }
        if (!student.recentGrades) {
            student.recentGrades = [];
        }
        student.recentGrades = student.recentGrades.filter(id => id.toString() !== submissionId.toString());
        student.recentGrades.unshift(`You got ${marks}/10 marks in ${submission.assignment.name}`);
        student.recentGrades = student.recentGrades.slice(0, 3);
        submission.isGraded = true;
        submission.marks = marks;
        await Promise.all([student.save(), submission.save()]);
        res.status(200).json({
            success: true,
            message: 'Submission graded successfully'
        });
    }
    catch (error) {
        const err = error;
        next(new types_1.CustomError('Failed to grade submission', 500, `${err.message}`));
    }
};
exports.default = gradeSubmission;
