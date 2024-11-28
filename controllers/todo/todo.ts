import {Response,NextFunction} from 'express';
import {CustomError,CustomRequest} from '../../types';
import {User , Todo} from '../../models';
import mongoose from 'mongoose';

const getAllTodos = async (req: CustomRequest, res: Response, next: NextFunction) => {
    if(!req.user?._id){
        next(new CustomError('User not found',404));
        return;
    }
    try{
        const [todos,user] = await Promise.all([Todo.find({user:req.user._id}),User.findById(req.user._id)]);
        if(!user){
            next(new CustomError('User not found',404));
            return;
        }
        res.status(200).json({
            todos,
            success:true,
            message:'Todos fetched successfully'
        });
    }catch(error){
        next(new CustomError('Failed to get todos',500,(error as Error).message));
    }
};

const createTodo = async (req: CustomRequest, res: Response, next: NextFunction) => {
    const { title, description } = req.body;
    if (!title || !description) {
        next(new CustomError("Title and description are required", 400));
        return;
    }

    if(!req.user?._id){
        next(new CustomError('User not found',404));
        return;
    }

    try {

        const user = await User.findById(req.user._id);
        if(!user){
            next(new CustomError('User not found',404));
            return;
        }
        const newTodo = new Todo({
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
    } catch (error) {
        next(new CustomError("Failed to create todo", 500, (error as Error).message));
    }
}

const updateTodo = async (req: CustomRequest, res: Response, next: NextFunction) => {
    const { title, description, isCompleted } = req.body;
    const { id } = req.params;
    if (!title && !description && isCompleted === undefined) {
        return next(new CustomError("Title, description or isCompleted is required", 400));
    }

    if(!req.user?._id){
        next(new CustomError('User not found',404));
        return;
    }

    try {
        const todo = await Todo.findOne({ _id: id, user: req.user._id });
        if (!todo) {
            next(new CustomError("Todo not found", 404));
            return;
        }

        if (title) todo.title = title;
        if (description) todo.description = description;
        if (isCompleted !== undefined) todo.isCompleted = isCompleted;


        await todo.save();
        res.status(200).json({
            success: true,
            message: "Todo updated successfully",
        });
    } catch (error) {
        next(new CustomError("Failed to update todo", 500, (error as Error).message));
    }
}

const deleteTodo = async (req: CustomRequest, res: Response, next: NextFunction) => {
    const { id } = req.params;

    if(!req.user?._id){
        next(new CustomError('User not found',404));
        return;
    }

    try {
        const todo = await Todo.findOne({ _id: id, user: req.user._id });
        if (!todo) {
            next(new CustomError("Todo not found", 404));
            return;
        }

        await todo.deleteOne();
        res.status(200).json({
            success: true,
            message: "Todo deleted successfully",
        });
    } catch (error) {
        next(new CustomError("Failed to delete todo", 500, (error as Error).message));
    }
}

const getTodoById = async (req: CustomRequest, res: Response, next: NextFunction) => {
    const { id } = req.params;
    if(!id || !mongoose.Types.ObjectId.isValid(id)){
        next(new CustomError('No Id received or Invalid Id.',400));
        return;
    }
    if(!req.user?._id){
        next(new CustomError('User not found',404));
        return;
    }

    try {
        const todo = await Todo.findOne({ _id: id, user: req.user._id });
        if (!todo) {
            next(new CustomError("Todo not found", 404));
            return;
        }

        res.status(200).json({
            success: true,
            todo,
            message: "Todo fetched successfully",
        });
    } catch (error) {
        next(new CustomError("Failed to get todo", 500, (error as Error).message));
    }
}

export {getAllTodos,createTodo,updateTodo,deleteTodo,getTodoById};