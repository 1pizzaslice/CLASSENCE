"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginUser = exports.registerUser = void 0;
const types_1 = require("../../types");
const models_1 = require("../../models");
const bcrypt_1 = __importDefault(require("bcrypt"));
const index_1 = require("../index");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const registerUser = async (req, res, next) => {
    let { name, email, password } = req.body;
    name = name.trim();
    email = email.trim();
    password = password.trim();
    if (!name || !email || !password) {
        next(new types_1.CustomError('Name, email and password is required', 400));
        return;
    }
    const lowerEmail = email.toLowerCase();
    const emailExist = await models_1.User.findOne({ email: lowerEmail });
    if (emailExist) {
        if (emailExist.isVerified) {
            next(new types_1.CustomError('Email already exists !!', 400));
            return;
        }
        await models_1.User.deleteOne({ email: lowerEmail });
    }
    // hash password
    const salt = await bcrypt_1.default.genSalt(10);
    const hashedPassword = await bcrypt_1.default.hash(password, salt);
    // store user in db
    const user = new models_1.User({
        name: name,
        email: lowerEmail,
        password: hashedPassword
    });
    try {
        await user.save();
        (0, index_1.sendOtpEmail)(req, res, next);
        res.status(201).send({
            success: true,
            message: 'OTP sent to your email',
            user: {
                id: user._id,
            },
        });
    }
    catch (error) {
        const err = error;
        next(new types_1.CustomError('Something went wrong', 500, `${err.message}`));
    }
};
exports.registerUser = registerUser;
const loginUser = async (req, res, next) => {
    var _a, _b;
    // create & assign a JWT
    try {
        let { email, password } = req.body;
        email = email.trim();
        password = password.trim();
        if (!email || !password) {
            next(new types_1.CustomError('Email and password is required', 400));
            return;
        }
        const lowerEmail = email.toLowerCase();
        const user = await models_1.User.findOne({ email: lowerEmail });
        if (!user) {
            next(new types_1.CustomError('User not found', 400));
            return;
        }
        if (!user.isVerified) {
            next(new types_1.CustomError('Please verify your email to login!', 400));
            return;
        }
        const validPass = await bcrypt_1.default.compare(password, user.password);
        if (validPass) {
            req.user = { _id: user._id };
        }
        else {
            next(new types_1.CustomError('Incorrect Password', 400));
            return;
        }
        const token = jsonwebtoken_1.default.sign({ _id: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id, version: user.version }, process.env.JWT_SECRET, {
            expiresIn: '24h'
        });
        const refreshToken = jsonwebtoken_1.default.sign({ _id: (_b = req.user) === null || _b === void 0 ? void 0 : _b._id, version: user.version }, process.env.JWT_SECRET, {
            expiresIn: '7d'
        });
        res.header('Authorization', `Bearer ${token}`).send({
            success: true,
            message: 'Logged in successfully!',
            token: token,
            refreshToken: refreshToken,
        });
    }
    catch (error) {
        const err = error;
        next(new types_1.CustomError('Something went wrong', 500, `${err.message}`));
    }
};
exports.loginUser = loginUser;
