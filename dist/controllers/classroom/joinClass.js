"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const models_1 = require("../../models");
const types_1 = require("../../types");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const joinClass = async (req, res, next) => {
    var _a;
    const { code, token } = req.body;
    // console.log(code)
    if (!code && !token) {
        next(new types_1.CustomError('Code or token is required', 400));
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
        const classroom = await models_1.Classroom.findOne({ code }).populate("teacher", "name _id");
        if (!classroom || classroom.isDeleted) {
            next(new types_1.CustomError('Classroom not found', 404));
            return;
        }
        if (user.classRooms.includes(classroom._id)) {
            next(new types_1.CustomError('Already joined the classroom', 400));
            return;
        }
        if (classroom.privacy === "private" && !token) {
            next(new types_1.CustomError('Token is required for private classrooms', 400));
            return;
        }
        if (classroom.privacy === "private") {
            try {
                const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
                if (decoded.classroomCode !== classroom.code) {
                    next(new types_1.CustomError('Invalid token', 400));
                    return;
                }
                if (decoded.email !== user.email) {
                    next(new types_1.CustomError('Invalid token', 400));
                    return;
                }
            }
            catch (error) {
                const err = error;
                next(new types_1.CustomError('Invalid token', 400, `${err.message}`));
                return;
            }
        }
        await Promise.all([
            models_1.Classroom.updateOne({ _id: classroom._id }, {
                $addToSet: { students: id },
                $pull: { invitedStudents: id }
            }),
            models_1.User.updateOne({ _id: user._id }, {
                $addToSet: {
                    classRooms: classroom._id,
                    joinedClassrooms: classroom._id
                }
            })
        ]);
        res.status(200).send({
            success: true,
            message: 'Classroom joined successfully',
            classroom
        });
    }
    catch (error) {
        const err = error;
        next(new types_1.CustomError('Something went wrong', 500, `${err.message}`));
    }
};
exports.default = joinClass;
