"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const models_1 = require("../../models");
const types_1 = require("../../types");
const deleteClass = async (req, res, next) => {
    var _a;
    const { code } = req.body;
    if (!code) {
        next(new types_1.CustomError('Classroom id is required', 400));
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
        if (classroom.teacher.toString() !== id) {
            next(new types_1.CustomError('You are not authorized to delete this classroom', 403));
            return;
        }
        classroom.isDeleted = true;
        if (user.recentClasses) {
            user.recentClasses = user.recentClasses.filter(classId => classId.toString() !== classroom._id.toString());
            await user.save();
        }
        ;
        await Promise.all([
            models_1.User.updateMany({
                $or: [
                    { classRooms: classroom._id },
                    { joinedClasses: classroom._id },
                    { joinedClassrooms: classroom._id },
                    { createdClassrooms: classroom._id }
                ]
            }, {
                $pull: {
                    classRooms: classroom._id,
                    joinedClasses: classroom._id,
                    joinedClassrooms: classroom._id,
                    createdClassrooms: classroom._id
                }
            }),
            classroom.save()
        ]);
        res.status(200).send({
            success: true,
            message: 'Classroom deleted successfully',
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
exports.default = deleteClass;
