"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const models_1 = require("../../models");
const types_1 = require("../../types");
const utility_1 = require("../../utility");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const inviteStudent = async (req, res, next) => {
    var _a;
    try {
        const { code, email } = req.body;
        if (!code || !email) {
            next(new types_1.CustomError('Code and email is required', 400));
            return;
        }
        const id = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!id) {
            next(new types_1.CustomError('User not found', 404));
            return;
        }
        const [user, classroom] = await Promise.all([models_1.User.findById(id), models_1.Classroom.findOne({ code })]);
        if (!classroom || classroom.isDeleted) {
            next(new types_1.CustomError('Classroom not found', 404));
            return;
        }
        if (!user) {
            next(new types_1.CustomError('User not found', 404));
            return;
        }
        if (classroom.teacher.toString() !== id) {
            next(new types_1.CustomError('You are not authorized to invite students to this classroom', 403));
            return;
        }
        const student = await models_1.User.findOne({ email });
        if (!student) {
            next(new types_1.CustomError('Student not found', 404));
            return;
        }
        if (student.classRooms.includes(classroom._id)) {
            next(new types_1.CustomError('Student already joined the classroom', 400));
            return;
        }
        if (classroom.invitedStudents.includes(student._id)) {
            next(new types_1.CustomError('Student already invited', 400));
            return;
        }
        classroom.invitedStudents.push(student._id);
        let joiningCode = code;
        if (classroom.privacy === 'private') {
            joiningCode = jsonwebtoken_1.default.sign({ email: student.email, classroomCode: classroom.code }, process.env.JWT_SECRET, { expiresIn: '1d' });
        }
        const inviteLink = `${process.env.FRONTEND_URL}/classroom/join/${joiningCode}?code=${classroom.code}`;
        const data = `
        <body style="margin: 0; padding: 0; width: 100%; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; width: 100%; margin: 20px auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff; box-sizing: border-box;">
            <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://i.ibb.co/41hPJtW/logo.png" alt="Classence Logo" style="width: 120px; max-width: 100%;">
            </div>
            <p style="color: #333333; font-size: 18px; line-height: 1.5; text-align: center; margin: 0 20px;">
            Hello there!
            </p>
            <!-- Invitation Message -->
            <p style="color: #555555; font-size: 16px; line-height: 1.6; text-align: center; margin: 20px 20px;">
            ${user.name} has invited you to join the classroom <strong>${classroom.code}</strong> on Classence!
            </p>
            <!-- Invitation Link -->
            <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteLink}" style="background-color: #066769; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-size: 16px;">
                Join Classroom
            </a>
            </div>
            <p style="color: #555555; font-size: 16px; line-height: 1.6; text-align: center; margin: 20px 20px;">
            Click the button above to join. We look forward to learning together!
            </p>
            <p style="color: #555555; font-size: 16px; line-height: 1.6; text-align: center; margin: 20px 20px;">
            Best regards,<br>
            The Classence Team
            </p>
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
            <p style="font-size: 13px; color: #a1a1a1; text-align: center; margin: 20px;">
            If you're having trouble clicking the button, copy and paste the URL below into your web browser:
            </p>
            <p style="font-size: 13px; color: #066769; word-break: break-all; text-align: center; margin: 0;">
            <a href="${inviteLink}" style="color: #066769; text-decoration: none;">${inviteLink}</a>
            </p>
        </div>
        </body>
        `;
        (0, utility_1.sendEmail)(student.email, 'Classroom Invitation', data);
        await classroom.save();
        res.status(200).send({
            success: true,
            message: 'Student invited successfully',
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
exports.default = inviteStudent;
