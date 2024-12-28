"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllReminders = exports.deleteReminder = exports.updateReminder = exports.createReminder = void 0;
const models_1 = require("../../models/");
const types_1 = require("../../types");
const moment_timezone_1 = __importDefault(require("moment-timezone"));
const createReminder = async (req, res, next) => {
    var _a;
    const { lectureId, scheduledTime, assignmentId } = req.body;
    //TODO:ADD SUPPORT FOR ASSIGNMENT
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!userId) {
        next(new types_1.CustomError("User not authenticated", 401));
        return;
    }
    if ((!lectureId && !assignmentId) || !scheduledTime) {
        next(new types_1.CustomError("Lecture ID/Assignment ID and scheduled time are required", 400));
        return;
    }
    if (scheduledTime < new Date()) {
        next(new types_1.CustomError("Cannot set reminder for past time", 400));
        return;
    }
    try {
        let reminder;
        if (lectureId) {
            const lectureExists = await models_1.Lecture.findById(lectureId);
            if (!lectureExists) {
                next(new types_1.CustomError("Lecture not found", 404));
                return;
            }
            if (lectureExists.startTime < new Date()) {
                next(new types_1.CustomError("Cannot set reminder for past lectures", 400));
                return;
            }
            reminder = await models_1.Reminder.create({
                user: userId,
                lecture: lectureId,
                scheduledTime,
                reminderType: "lecture"
            });
        }
        else {
            const assignmentExists = await models_1.Assignment.findById(assignmentId);
            if (!assignmentExists) {
                next(new types_1.CustomError("Assignment not found", 404));
                return;
            }
            if (assignmentExists.dueDate < new Date()) {
                next(new types_1.CustomError("Cannot set reminder for past assignments", 400));
                return;
            }
            reminder = await models_1.Reminder.create({
                user: userId,
                assignment: assignmentId,
                scheduledTime,
                reminderType: "assignment"
            });
        }
        res.status(201).json({
            success: true,
            message: "Reminder created successfully!",
            reminder,
        });
    }
    catch (error) {
        next(new types_1.CustomError("Error creating reminder", 500));
    }
};
exports.createReminder = createReminder;
const updateReminder = async (req, res, next) => {
    const { reminderId } = req.params;
    const { scheduledTime } = req.body;
    if (!scheduledTime) {
        next(new types_1.CustomError("Scheduled time is required", 400));
        return;
    }
    try {
        const updatedReminder = await models_1.Reminder.findByIdAndUpdate(reminderId, { scheduledTime }, { new: true });
        if (!updatedReminder) {
            next(new types_1.CustomError("Reminder not found", 404));
            return;
        }
        res.status(200).json({
            success: true,
            message: "Reminder updated successfully!",
            updatedReminder,
        });
    }
    catch (error) {
        next(new types_1.CustomError("Error updating reminder", 500));
    }
};
exports.updateReminder = updateReminder;
const deleteReminder = async (req, res, next) => {
    const { reminderId } = req.params;
    if (!reminderId) {
        next(new types_1.CustomError("Reminder ID is required", 400));
        return;
    }
    try {
        const deletedReminder = await models_1.Reminder.findByIdAndDelete(reminderId);
        if (!deletedReminder) {
            next(new types_1.CustomError("Reminder not found", 404));
            return;
        }
        res.status(200).json({
            success: true,
            message: "Reminder deleted successfully!",
        });
    }
    catch (error) {
        next(new types_1.CustomError("Error deleting reminder", 500));
    }
};
exports.deleteReminder = deleteReminder;
const getAllReminders = async (req, res, next) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!userId) {
        next(new types_1.CustomError("User not authenticated", 401));
        return;
    }
    try {
        const reminders = await models_1.Reminder.find({ user: userId }).populate("lecture", "title startTime").populate("assignment", "title dueDate");
        const formattedReminders = reminders.map(reminder => (Object.assign(Object.assign({}, reminder.toObject()), { scheduledTime: (0, moment_timezone_1.default)(reminder.scheduledTime).tz('Asia/Kolkata').format('MMM D, hh:mm A') })));
        res.status(200).json({
            success: true,
            reminders: formattedReminders,
        });
    }
    catch (error) {
        next(new types_1.CustomError("Error fetching reminders", 500));
    }
};
exports.getAllReminders = getAllReminders;
