import { Response , NextFunction } from "express";
import { CustomError, CustomRequest } from "../../types";
import { User } from "../../models";
import Bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const changePassword = async (req: CustomRequest, res: Response, next: NextFunction) => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
        return next(new CustomError("Old password and new password are required", 400));
    }

    const id = req.user?._id;
    if (!id) {
        return next(new CustomError("User not found", 404));
    }

    try{
        const user = await User.findById(id);
        if(!user){
            return next(new CustomError("User not found", 404));
        }
        const isMatch = await Bcrypt.compare(oldPassword, user.password);
        if(!isMatch){
            return next(new CustomError("Old password is incorrect", 400));
        }

        const hashedPassword = await Bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.version++;
        await user.save();

        const token = jwt.sign({ _id: req.user?._id,version:user.version }, process.env.JWT_SECRET as string , {
            expiresIn: '1h'
        });
        const refreshToken = jwt.sign({ _id: req.user?._id,version:user.version }, process.env.JWT_SECRET as string , {
            expiresIn: '1d'
        });
        res.status(200).json({
            success: true,
            message: "Password changed successfully",
            token,
            refreshToken
        });
    }catch(error){
        const err = error as Error;
        next(new CustomError("Failed to change password", 500, err.message));
    }
};

const changeIsNotificationEnabled = async (req: CustomRequest, res: Response, next: NextFunction) => {
    const { isNotification } = req.body;
    if (!isNotification && typeof isNotification !== "boolean") {
        return next(new CustomError("isNotification is required", 400));
    }
    const id = req.user?._id;
    if (!id) {
        return next(new CustomError("User not found", 404));
    }

    try{
        const user = await User.findById(id);
        if(!user){
            return next(new CustomError("User not found", 404));
        }
        user.isNotificationEnabled = isNotification;
        await user.save();
        res.status(200).json({
            success: true,
            message: "Notification Settings changed successfully",
        });
    }catch(error){
        const err = error as Error;
        next(new CustomError("Failed to change isNotification", 500, err.message));
    }
}

const changeName = async (req: CustomRequest, res: Response, next: NextFunction) => {
    const { name } = req.body;
    if (!name) {
        return next(new CustomError("Name is required", 400));
    }
    if(name.trim().length<3){
        return next(new CustomError("Name should be more than 3 characters", 400));
    }

    const id = req.user?._id;
    if (!id) {
        return next(new CustomError("User not found", 404));
    }

    try{
        const user = await User.findById(id);
        if(!user){
            return next(new CustomError("User not found", 404));
        }
        user.name = name;
        await user.save();
        res.status(200).json({
            success: true,
            message: "Name changed successfully",
        });
    }catch(error){
        const err = error as Error;
        next(new CustomError("Failed to change name", 500, err.message));
    }
}

const signOutAllDevices = async (req: CustomRequest, res: Response, next: NextFunction) => {
    const id = req.user?._id;
    if (!id) {
        return next(new CustomError("User not found", 404));
    }

    try{
        const user = await User.findById(id);
        if(!user){
            return next(new CustomError("User not found", 404));
        }
        user.version++;
        await user.save();
        res.status(200).json({
            success: true,
            message: "Signed out from all devices successfully",
        });
    }catch(error){
        const err = error as Error;
        next(new CustomError("Failed to sign out all devices", 500, err.message));
    }
}
export { changePassword, changeIsNotificationEnabled ,changeName,signOutAllDevices};

