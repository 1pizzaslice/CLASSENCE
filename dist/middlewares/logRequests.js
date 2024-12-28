"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logRequests = (req, res, next) => {
    const { method, url, ip } = req;
    const origin = req.headers.origin || 'unknown';
    const log = `${method} ${url} ${origin} ${new Date().toISOString()} ${ip}\n`;
    const logsDir = path_1.default.join(__dirname, '../logs');
    const logFilePath = path_1.default.join(logsDir, 'requests.txt');
    if (!fs_1.default.existsSync(logsDir)) {
        fs_1.default.mkdirSync(logsDir, { recursive: true });
    }
    if (!fs_1.default.existsSync(logFilePath)) {
        fs_1.default.writeFileSync(logFilePath, '');
    }
    fs_1.default.appendFile(logFilePath, log, (err) => {
        if (err) {
            console.log(err);
        }
    });
    next();
};
exports.default = logRequests;
