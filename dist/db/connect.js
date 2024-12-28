"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGO_URI;
        await mongoose_1.default.connect(mongoURI);
        console.log('DB connected');
    }
    catch (error) {
        console.error('DB connection failed:', error);
        process.exit(1); // exit the process with failure
    }
};
exports.default = connectDB;
