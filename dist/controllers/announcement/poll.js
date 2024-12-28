"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPollResults = exports.submitPollResponse = void 0;
const types_1 = require("../../types");
const models_1 = require("../../models");
const models_2 = require("../../models");
const submitPollResponse = async (req, res, next) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
    }
    const { announcementId, selectedOption } = req.body;
    try {
        const pollResponse = new models_1.PollResponse({
            announcementId,
            userId,
            selectedOption
        });
        await pollResponse.save();
        await models_2.Announcement.updateOne({ _id: announcementId, 'poll.options.optionText': selectedOption }, { $inc: { 'poll.options.$.votes': 1 } });
        res.status(201).json({ success: true, message: 'Poll response submitted successfully' });
    }
    catch (error) {
        next(new types_1.CustomError('Failed to submit poll response', 500));
    }
};
exports.submitPollResponse = submitPollResponse;
const getPollResults = async (req, res, next) => {
    const { announcementId } = req.params;
    try {
        const responses = await models_1.PollResponse.find({ announcementId }).populate('userId', 'name');
        res.json({ success: true, responses });
    }
    catch (error) {
        next(new types_1.CustomError('Failed to get poll results', 500));
    }
};
exports.getPollResults = getPollResults;
