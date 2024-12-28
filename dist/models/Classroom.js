"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const ClassroomSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true
    },
    code: {
        type: String,
        required: true,
        unique: true
    },
    subject: {
        type: String,
        required: true
    },
    privacy: {
        type: String,
        required: true,
        default: 'public'
    },
    students: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User'
        }],
    teacher: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User'
    },
    assignments: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Assignment'
        }],
    announcements: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Announcement'
        }],
    isDeleted: {
        type: Boolean,
        default: false
    },
    isCompleted: {
        type: Boolean,
        default: false
    },
    invitedStudents: [{
            type: mongoose_1.Schema.Types.ObjectId,
        }],
    lectures: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Lecture'
        }
    ]
}, { timestamps: true });
const Classroom = (0, mongoose_1.model)('Classroom', ClassroomSchema);
exports.default = Classroom;
