"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const OtpSchema = new mongoose_1.Schema({
    email: {
        type: String,
        required: true
    },
    otp: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 }
    }
}, { timestamps: true });
const Otp = (0, mongoose_1.model)('Otp', OtpSchema);
exports.default = Otp;
