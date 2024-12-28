"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const errorHandler = (error, req, res, next) => {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    const errorMsg = error.error || message;
    const log = `${statusCode} ${errorMsg} ${new Date().toISOString()} ${req.ip} ${req.method} ${req.url}\n`;
    const logsDir = path_1.default.join(__dirname, '../logs');
    const logFilePath = path_1.default.join(logsDir, 'errors.txt');
    if (!fs_1.default.existsSync(logsDir)) {
        fs_1.default.mkdirSync(logsDir, { recursive: true });
    }
    if (!fs_1.default.existsSync(logFilePath)) {
        fs_1.default.writeFileSync(logFilePath, "");
    }
    fs_1.default.appendFile(logFilePath, log, (err) => {
        if (err) {
            console.log(err);
        }
    });
    res.status(statusCode).json({
        success: false,
        error: message,
    });
};
exports.default = errorHandler;
