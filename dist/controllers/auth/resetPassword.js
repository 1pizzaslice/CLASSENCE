"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.requestPasswordReset = void 0;
const models_1 = require("../../models");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const utility_1 = require("../../utility");
const types_1 = require("../../types");
const requestPasswordReset = async (req, res, next) => {
    try {
        let { email } = req.body;
        email = email.trim();
        if (!email) {
            next(new types_1.CustomError('Email is required', 400));
            return;
        }
        const user = await models_1.User.findOne({ email });
        if (!user) {
            next(new types_1.CustomError('User not found', 404));
            return;
        }
        if (!user.isVerified) {
            next(new types_1.CustomError('Please verify your email to reset password!', 400));
            return;
        }
        const fiveMinutes = 0.5 * 60 * 1000;
        const now = Date.now();
        if (user.lastPasswordResetRequest && (now - user.lastPasswordResetRequest.getTime()) < fiveMinutes) {
            next(new types_1.CustomError('You can request a new password reset link only every 30 sec', 429));
            return;
        }
        const token = jsonwebtoken_1.default.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
        user.resetPasswordToken = token;
        user.resetPasswordExpires = new Date(Date.now() + 3600000);
        user.lastPasswordResetRequest = new Date(now);
        await user.save();
        const data = `
    <body style="margin: 0; padding: 0; width: 100%; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <div style="max-width: 600px; width: 100%; margin: 20px auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff; box-sizing: border-box;">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="https://i.ibb.co/41hPJtW/logo.png" alt="Logo" style="width: 120px; max-width: 100%;">
        </div>
        <p style="color: #333333; font-size: 18px; line-height: 1.5; text-align: center; margin: 0 20px;">
          Hello ${user.name},
        </p>
        <p style="color: #555555; font-size: 16px; line-height: 1.6; text-align: center; margin: 20px 20px;">
          We received a request to reset your password. Click the button below to proceed:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #066769; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-size: 16px;">
            Reset Password
          </a>
        </div>
        <p style="color: #555555; font-size: 16px; line-height: 1.6; text-align: center; margin: 20px 20px;">
          If you didn't request this, please ignore this email. Your account will remain secure.
        </p>
        <p style="color: #555555; font-size: 16px; line-height: 1.6; text-align: center; margin: 20px 20px;">
          Best regards,<br>
          Classence Team
        </p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
        <p style="font-size: 13px; color: #a1a1a1; text-align: center; margin: 20px;">
          If you're having trouble clicking the button, copy and paste the URL below into your web browser:
        </p>
        <p style="font-size: 13px; color: #066769; word-break: break-all; text-align: center; margin: 0;">
          <a href="${resetUrl}" style="color: #066769; text-decoration: none;">${resetUrl}</a>
        </p>
      </div>
    </body>
  `;
        (0, utility_1.sendEmail)(user.email, 'Password Reset Request', data)
            .catch((error) => { console.log("Error sending email: ", error); });
        res.status(200).json({
            success: true,
            message: 'Password reset link has been sent to your email! Please check your inbox, it should arrive within a few seconds.'
        });
    }
    catch (error) {
        const err = error;
        next(new types_1.CustomError('Something went wrong', 500, `${err.message}`));
    }
};
exports.requestPasswordReset = requestPasswordReset;
const resetPassword = async (req, res, next) => {
    try {
        const { token } = req.params;
        let { password } = req.body;
        password = password.trim();
        if (!password) {
            next(new types_1.CustomError('Password is required', 400));
            return;
        }
        //   console.log(typeof token);
        if (typeof token !== 'string') {
            next(new types_1.CustomError('Invalid token', 400));
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;
        const user = await models_1.User.findById(userId);
        if (!user || user.resetPasswordToken !== token) {
            next(new types_1.CustomError('Invalid token', 400));
            return;
        }
        if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
            next(new types_1.CustomError('Invalid or expired token', 400));
            return;
        }
        const salt = await bcrypt_1.default.genSalt(10);
        const hashedPassword = await bcrypt_1.default.hash(password, salt);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        user.password = hashedPassword;
        user.version += 1;
        await user.save();
        res.status(200).json({ success: true, message: 'Password reset successfully' });
    }
    catch (error) {
        const err = error;
        next(new types_1.CustomError('Something went wrong', 500, `${err.message}`));
    }
};
exports.resetPassword = resetPassword;
