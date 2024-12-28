"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceStatus = exports.LectureStatus = void 0;
const mongoose_1 = require("mongoose");
var LectureStatus;
(function (LectureStatus) {
    LectureStatus["Scheduled"] = "Scheduled";
    LectureStatus["InProgress"] = "InProgress";
    LectureStatus["Completed"] = "Completed";
})(LectureStatus || (exports.LectureStatus = LectureStatus = {}));
var AttendanceStatus;
(function (AttendanceStatus) {
    AttendanceStatus["Present"] = "Present";
    AttendanceStatus["Absent"] = "Absent";
})(AttendanceStatus || (exports.AttendanceStatus = AttendanceStatus = {}));
const AttendanceSchema = new mongoose_1.Schema({
    student: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    status: {
        type: String,
        enum: Object.values(AttendanceStatus),
        default: AttendanceStatus.Absent,
    }
}, { _id: false });
const LectureSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        default: null,
        validate: {
            validator: function (value) {
                return !value || value > this.startTime;
            },
            message: "End time must be greater than start time.",
        },
    },
    status: {
        type: String,
        enum: {
            values: Object.values(LectureStatus),
            message: `{VALUE} is not a valid lecture status`,
        },
        default: LectureStatus.Scheduled,
    },
    classroom: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Classroom",
        required: true
    },
    teacher: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    youtubeLiveStreamURL: {
        type: String,
        default: null
    },
    attendance: [AttendanceSchema],
    statusTimestamps: {
        scheduledAt: { type: Date, default: Date.now },
        startedAt: { type: Date, default: null },
        completedAt: { type: Date, default: null },
    },
}, { timestamps: true, versionKey: false });
LectureSchema.index({ classroom: 1, startTime: 1 }); //add index for better performance
LectureSchema.index({ teacher: 1 });
LectureSchema.index({ status: 1 });
AttendanceSchema.index({ student: 1, status: 1 });
const Lecture = (0, mongoose_1.model)("Lecture", LectureSchema);
exports.default = Lecture;
