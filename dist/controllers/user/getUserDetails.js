"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const models_1 = require("../../models");
const types_1 = require("../../types");
const getUserDetails = async (req, res, next) => {
    var _a;
    const id = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!id) {
        next(new types_1.CustomError('User not found', 404));
        return;
    }
    try {
        const user = await models_1.User.findById(id, "name _id classRooms email")
            .populate({
            path: "classRooms",
            select: "name subject _id teacher code students",
            populate: {
                path: "teacher",
                select: "name _id",
            },
        })
            .lean();
        if (!user) {
            next(new types_1.CustomError('User not found', 404));
            return;
        }
        const createdClasses = [];
        const joinedClasses = [];
        if (user.classRooms && user.classRooms.length > 0) {
            for (const classroom of user.classRooms) {
                if (classroom.teacher._id.toString() === id.toString()) {
                    // console.log(classroom)
                    createdClasses.push({
                        _id: classroom._id,
                        name: classroom.name,
                        subject: classroom.subject,
                        teacher: classroom.teacher,
                        code: classroom.code,
                        noOfStudents: classroom.students.length,
                    });
                }
                else {
                    joinedClasses.push({
                        _id: classroom._id,
                        name: classroom.name,
                        subject: classroom.subject,
                        teacher: classroom.teacher,
                        code: classroom.code,
                        noOfStudents: classroom.students.length,
                    });
                }
            }
        }
        res.status(200).json({
            success: true,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt,
                createdClasses,
                joinedClasses,
                noOfCreatedClasses: createdClasses.length,
                noOfJoinedClasses: joinedClasses.length,
            },
        });
    }
    catch (error) {
        const err = error;
        // console.log(err);
        next(new types_1.CustomError('Failed to get user details', 500, `${err.message}`));
    }
};
exports.default = getUserDetails;
