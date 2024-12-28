"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const socketErrorHandler = (socket, next) => {
    try {
        next();
    }
    catch (error) {
        const err = error;
        const statusCode = err.statusCode || 500;
        const message = err.message || 'Internal Server Error';
        const errorMsg = err.error || message;
        const log = `${statusCode} ${errorMsg} ${new Date().toISOString()} ${socket.handshake.address} ${socket.nsp.name} ${socket.id}\n`;
        const logsDir = path_1.default.join(__dirname, '../logs');
        const logFilePath = path_1.default.join(logsDir, 'socket_errors.txt');
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
        socket.emit('error', message);
    }
};
exports.default = socketErrorHandler;
