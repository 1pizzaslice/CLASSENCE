"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signOutAllDevices = exports.changeName = exports.changeIsNotificationEnabled = exports.changePassword = void 0;
const types_1 = require("../../types");
const models_1 = require("../../models");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const changePassword = async (req, res, next) => {
    var _a, _b, _c;
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
        return next(new types_1.CustomError("Old password and new password are required", 400));
    }
    const id = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!id) {
        return next(new types_1.CustomError("User not found", 404));
    }
    try {
        const user = await models_1.User.findById(id);
        if (!user) {
            return next(new types_1.CustomError("User not found", 404));
        }
        const isMatch = await bcrypt_1.default.compare(oldPassword, user.password);
        if (!isMatch) {
            return next(new types_1.CustomError("Old password is incorrect", 400));
        }
        const hashedPassword = await bcrypt_1.default.hash(newPassword, 10);
        user.password = hashedPassword;
        user.version++;
        await user.save();
        const token = jsonwebtoken_1.default.sign({ _id: (_b = req.user) === null || _b === void 0 ? void 0 : _b._id, version: user.version }, process.env.JWT_SECRET, {
            expiresIn: '1h'
        });
        const refreshToken = jsonwebtoken_1.default.sign({ _id: (_c = req.user) === null || _c === void 0 ? void 0 : _c._id, version: user.version }, process.env.JWT_SECRET, {
            expiresIn: '1d'
        });
        res.status(200).json({
            success: true,
            message: "Password changed successfully",
            token,
            refreshToken
        });
    }
    catch (error) {
        const err = error;
        next(new types_1.CustomError("Failed to change password", 500, err.message));
    }
};
exports.changePassword = changePassword;
const changeIsNotificationEnabled = async (req, res, next) => {
    var _a;
    const { isNotification } = req.body;
    if (!isNotification && typeof isNotification !== "boolean") {
        return next(new types_1.CustomError("isNotification is required", 400));
    }
    const id = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!id) {
        return next(new types_1.CustomError("User not found", 404));
    }
    try {
        const user = await models_1.User.findById(id);
        if (!user) {
            return next(new types_1.CustomError("User not found", 404));
        }
        user.isNotificationEnabled = isNotification;
        await user.save();
        res.status(200).json({
            success: true,
            message: "Notification Settings changed successfully",
        });
    }
    catch (error) {
        const err = error;
        next(new types_1.CustomError("Failed to change isNotification", 500, err.message));
    }
};
exports.changeIsNotificationEnabled = changeIsNotificationEnabled;
const changeName = async (req, res, next) => {
    var _a;
    const { name } = req.body;
    if (!name) {
        return next(new types_1.CustomError("Name is required", 400));
    }
    if (name.trim().length < 3) {
        return next(new types_1.CustomError("Name should be more than 3 characters", 400));
    }
    const id = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!id) {
        return next(new types_1.CustomError("User not found", 404));
    }
    try {
        const user = await models_1.User.findById(id);
        if (!user) {
            return next(new types_1.CustomError("User not found", 404));
        }
        user.name = name;
        await user.save();
        res.status(200).json({
            success: true,
            message: "Name changed successfully",
        });
    }
    catch (error) {
        const err = error;
        next(new types_1.CustomError("Failed to change name", 500, err.message));
    }
};
exports.changeName = changeName;
const signOutAllDevices = async (req, res, next) => {
    var _a;
    const id = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!id) {
        return next(new types_1.CustomError("User not found", 404));
    }
    try {
        const user = await models_1.User.findById(id);
        if (!user) {
            return next(new types_1.CustomError("User not found", 404));
        }
        user.version++;
        await user.save();
        res.status(200).json({
            success: true,
            message: "Signed out from all devices successfully",
        });
    }
    catch (error) {
        const err = error;
        next(new types_1.CustomError("Failed to sign out all devices", 500, err.message));
    }
};
exports.signOutAllDevices = signOutAllDevices;
