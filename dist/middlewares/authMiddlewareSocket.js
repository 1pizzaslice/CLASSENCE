"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const models_1 = require("../models");
const authenticateSocket = async (socket, next) => {
    const token = socket.handshake.query.token;
    console.log(token);
    if (!token) {
        const error = {
            type: 'TOKEN_MISSING',
            message: 'No authentication token provided'
        };
        socket.emit('auth_error', error);
        return next(new Error(error.message));
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userId = decoded._id;
        const user = await models_1.User.findById(userId);
        if (!user) {
            const error = {
                type: 'USER_NOT_FOUND',
                message: 'User not found in database'
            };
            socket.emit('auth_error', error);
            return next(new Error(error.message));
        }
        if (user.version !== decoded.version) {
            const error = {
                type: 'TOKEN_EXPIRED',
                message: 'Session expired, please login again'
            };
            socket.emit('auth_error', error);
            return next(new Error(error.message));
        }
        const customSocket = socket;
        customSocket.user = {
            _id: user._id,
            name: user.name,
        };
        next();
    }
    catch (err) {
        const error = {
            type: 'AUTH_ERROR',
            message: 'Invalid authentication token'
        };
        socket.emit('auth_error', error);
        return next(new Error(error.message));
    }
};
exports.default = authenticateSocket;
