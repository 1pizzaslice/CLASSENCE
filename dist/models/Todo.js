"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const TodoSchema = new mongoose_1.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    isCompleted: { type: Boolean, default: false },
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });
const Todo = (0, mongoose_1.model)("Todo", TodoSchema);
exports.default = Todo;
