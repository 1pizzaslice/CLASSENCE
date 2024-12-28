"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../types");
const models_1 = require("../models");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const verify = async (req, res, next) => {
    const auth = req.header('Authorization');
    if (!auth) {
        next(new types_1.CustomError(`Access denied`, 401));
        return;
    }
    let token = auth.split(' ')[1];
    if (!token) {
        next(new types_1.CustomError(`Access denied`, 401));
        return;
    }
    try {
        const verify = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        if (verify && '_id' in verify && 'version' in verify) {
            const user = await models_1.User.findById(verify._id);
            if (user && user.version !== verify.version) {
                next(new types_1.CustomError(`Invalid token`, 400));
                return;
            }
            req.user = { _id: verify._id, version: verify.version };
            next();
        }
        else {
            next(new types_1.CustomError(`Invalid token`, 400));
            return;
        }
    }
    catch (error) {
        const err = error;
        next(new types_1.CustomError(`Invalid token`, 400, `${err.message}`));
    }
};
exports.default = verify;
