"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const UserSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        min: 3,
        max: 255
    },
    email: {
        type: String,
        required: true,
        max: 255
    },
    password: {
        type: String,
        required: true,
        max: 1024, //enough space to store hashes 
        min: 6
    },
    resetPasswordToken: {
        type: String,
    },
    resetPasswordExpires: {
        type: Date,
    },
    lastPasswordResetRequest: {
        type: Date,
    },
    isVerified: {
        type: Boolean,
        required: true,
        default: false
    },
    classRooms: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Classroom'
        }],
    createdClassrooms: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Classroom'
        }],
    joinedClassrooms: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Classroom'
        }],
    version: {
        type: Number,
        default: 0
    },
    recentClasses: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Classroom'
        }],
    recentGrades: [{
            type: String,
        }],
    isNotificationEnabled: {
        type: Boolean,
        default: true
    },
    recentNotifications: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Notification'
        }],
    isAdmin: {
        type: Boolean,
        default: false
    },
    currentStreak: {
        type: Number,
        default: 0
    },
    longestStreak: {
        type: Number,
        default: 0
    },
}, { timestamps: true });
const User = (0, mongoose_1.model)('User', UserSchema);
exports.default = User;
