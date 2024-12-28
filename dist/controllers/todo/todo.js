"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTodoById = exports.deleteTodo = exports.updateTodo = exports.createTodo = exports.getAllTodos = void 0;
const types_1 = require("../../types");
const models_1 = require("../../models");
const mongoose_1 = __importDefault(require("mongoose"));
const getAllTodos = async (req, res, next) => {
    var _a;
    if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a._id)) {
        next(new types_1.CustomError('User not found', 404));
        return;
    }
    try {
        const [todos, user] = await Promise.all([models_1.Todo.find({ user: req.user._id }), models_1.User.findById(req.user._id)]);
        if (!user) {
            next(new types_1.CustomError('User not found', 404));
            return;
        }
        res.status(200).json({
            todos,
            success: true,
            message: 'Todos fetched successfully'
        });
    }
    catch (error) {
        next(new types_1.CustomError('Failed to get todos', 500, error.message));
    }
};
exports.getAllTodos = getAllTodos;
const createTodo = async (req, res, next) => {
    var _a;
    const { title, description } = req.body;
    if (!title || !description) {
        next(new types_1.CustomError("Title and description are required", 400));
        return;
    }
    if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a._id)) {
        next(new types_1.CustomError('User not found', 404));
        return;
    }
    try {
        const user = await models_1.User.findById(req.user._id);
        if (!user) {
            next(new types_1.CustomError('User not found', 404));
            return;
        }
        const newTodo = new models_1.Todo({
            title,
            description,
            user: req.user._id
        });
        await newTodo.save();
        res.status(201).json({
            success: true,
            message: "Todo created successfully",
            todo: newTodo
        });
    }
    catch (error) {
        next(new types_1.CustomError("Failed to create todo", 500, error.message));
    }
};
exports.createTodo = createTodo;
const updateTodo = async (req, res, next) => {
    var _a;
    const { title, description, isCompleted } = req.body;
    const { id } = req.params;
    if (!title && !description && isCompleted === undefined) {
        return next(new types_1.CustomError("Title, description or isCompleted is required", 400));
    }
    if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a._id)) {
        next(new types_1.CustomError('User not found', 404));
        return;
    }
    try {
        const todo = await models_1.Todo.findOne({ _id: id, user: req.user._id });
        if (!todo) {
            next(new types_1.CustomError("Todo not found", 404));
            return;
        }
        if (title)
            todo.title = title;
        if (description)
            todo.description = description;
        if (isCompleted !== undefined)
            todo.isCompleted = isCompleted;
        await todo.save();
        res.status(200).json({
            success: true,
            message: "Todo updated successfully",
        });
    }
    catch (error) {
        next(new types_1.CustomError("Failed to update todo", 500, error.message));
    }
};
exports.updateTodo = updateTodo;
const deleteTodo = async (req, res, next) => {
    var _a;
    const { id } = req.params;
    if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a._id)) {
        next(new types_1.CustomError('User not found', 404));
        return;
    }
    try {
        const todo = await models_1.Todo.findOne({ _id: id, user: req.user._id });
        if (!todo) {
            next(new types_1.CustomError("Todo not found", 404));
            return;
        }
        await todo.deleteOne();
        res.status(200).json({
            success: true,
            message: "Todo deleted successfully",
        });
    }
    catch (error) {
        next(new types_1.CustomError("Failed to delete todo", 500, error.message));
    }
};
exports.deleteTodo = deleteTodo;
const getTodoById = async (req, res, next) => {
    var _a;
    const { id } = req.params;
    if (!id || !mongoose_1.default.Types.ObjectId.isValid(id)) {
        next(new types_1.CustomError('No Id received or Invalid Id.', 400));
        return;
    }
    if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a._id)) {
        next(new types_1.CustomError('User not found', 404));
        return;
    }
    try {
        const todo = await models_1.Todo.findOne({ _id: id, user: req.user._id });
        if (!todo) {
            next(new types_1.CustomError("Todo not found", 404));
            return;
        }
        res.status(200).json({
            success: true,
            todo,
            message: "Todo fetched successfully",
        });
    }
    catch (error) {
        next(new types_1.CustomError("Failed to get todo", 500, error.message));
    }
};
exports.getTodoById = getTodoById;
