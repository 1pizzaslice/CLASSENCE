"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const models_1 = require("../../models");
const types_1 = require("../../types");
const removeStudent = async (req, res, next) => {
    var _a;
    const { code, studentId } = req.body;
    if (!code || !studentId) {
        next(new types_1.CustomError('Code and studentId is required', 400));
        return;
    }
    const id = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!id) {
        next(new types_1.CustomError('User not found', 404));
        return;
    }
    try {
        const user = await models_1.User.findById(id);
        if (!user) {
            next(new types_1.CustomError('User not found', 404));
            return;
        }
        const classroom = await models_1.Classroom.findOne({ code });
        if (!classroom || classroom.isDeleted) {
            next(new types_1.CustomError('Classroom not found', 404));
            return;
        }
        if (!classroom.students.includes(studentId)) {
            next(new types_1.CustomError('Student not found in the classroom', 404));
            return;
        }
        if (classroom.teacher.toString() !== id) {
            next(new types_1.CustomError('You are not authorized to remove students from this classroom', 403));
            return;
        }
        classroom.students = classroom.students.filter((student) => student.toString() !== studentId);
        const student = await models_1.User.findById(studentId);
        if (student && student.recentClasses) {
            student.recentClasses = student.recentClasses.filter(classId => classId.toString() !== classroom._id.toString());
            await student.save();
        }
        await Promise.all([
            classroom.save(),
            models_1.User.updateOne({ _id: studentId }, { $pull: { classRooms: classroom._id, joinedClassrooms: classroom._id
                },
            })
        ]);
        res.status(200).send({
            success: true,
            message: 'Student removed successfully',
            classroom: {
                _id: classroom._id,
                code: classroom.code
            }
        });
    }
    catch (error) {
        const err = error;
        next(new types_1.CustomError('Something went wrong', 500, `${err.message}`));
    }
};
exports.default = removeStudent;
