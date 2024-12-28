"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const models_1 = require("../../models");
const types_1 = require("../../types");
const getClassroomDetails = async (req, res, next) => {
    var _a;
    const { code } = req.query;
    const id = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!id) {
        next(new types_1.CustomError('User not found', 404));
        return;
    }
    if (!code) {
        next(new types_1.CustomError('Code is required', 400));
        return;
    }
    try {
        const [classroom, user] = await Promise.all([
            models_1.Classroom.findOne({ code })
                .select("name code subject teacher students announcements createdAt")
                .populate([
                { path: "teacher", select: "name" },
                { path: "students", select: "name" },
                {
                    path: "announcements",
                    select: "title description media createdAt",
                    options: { sort: { createdAt: -1 } },
                },
            ]),
            models_1.User.findById(id),
        ]);
        if (!user) {
            next(new types_1.CustomError('User not found', 404));
            return;
        }
        if (!classroom || classroom.isDeleted) {
            next(new types_1.CustomError('Classroom not found', 404));
            return;
        }
        if (!user.classRooms.includes(classroom === null || classroom === void 0 ? void 0 : classroom._id)) {
            next(new types_1.CustomError('You are not authorized to view this classroom', 403));
            return;
        }
        if (!user.recentClasses) {
            user.recentClasses = [];
        }
        user.recentClasses = user.recentClasses.filter(id => id.toString() !== classroom._id.toString());
        user.recentClasses.unshift(classroom._id);
        user.recentClasses = user.recentClasses.slice(0, 2);
        await user.save();
        res.status(200).json({ success: true, message: "Classroom details fetched successfully!", classroom });
    }
    catch (error) {
        const err = error;
        next(new types_1.CustomError('Failed to get classroom details', 500, `${err.message}`));
    }
};
exports.default = getClassroomDetails;
