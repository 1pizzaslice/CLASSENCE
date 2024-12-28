"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const models_1 = require("../../models");
const types_1 = require("../../types");
const uuid_1 = require("uuid"); // UUID generator
function generateUniqueCode(length = 6) {
    const uuid = (0, uuid_1.v4)().replace(/[^a-zA-Z0-9]/g, '');
    return uuid.slice(0, length).toUpperCase();
}
const createClass = async (req, res, next) => {
    var _a;
    const { name, subject, privacy } = req.body;
    // console.log(req.body);
    if (!name || !subject || !privacy) {
        next(new types_1.CustomError('Name, Subject or privacy are required!', 400));
        return;
    }
    if (privacy !== "public" && privacy !== "private") {
        next(new types_1.CustomError('Privacy must be either public or private', 400));
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
        const existingClasses = await models_1.Classroom.find().select("code").lean();
        const existingCodes = new Set(existingClasses.map((cls) => cls.code));
        let code;
        do {
            code = generateUniqueCode();
        } while (existingCodes.has(code));
        const classroom = new models_1.Classroom({
            name,
            code,
            subject,
            privacy,
            teacher: id,
        });
        user.classRooms.push(classroom._id);
        user.createdClassrooms.push(classroom._id);
        await Promise.all([classroom.save(), user.save()]);
        res.status(201).send({
            success: true,
            message: 'Classroom created successfully',
            classroom: {
                _id: classroom._id,
                code: classroom.code,
                name: classroom.name,
                subject: classroom.subject,
                privacy: classroom.privacy
            }
        });
    }
    catch (error) {
        const err = error;
        next(new types_1.CustomError('Something went wrong', 500, `${err.message}`));
    }
};
exports.default = createClass;
