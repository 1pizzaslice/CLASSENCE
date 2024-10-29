import { Request, Response, NextFunction } from 'express'
import {CustomRequest , CustomError } from "../types";
import { z } from "zod";
import bcrypt from 'bcrypt';
import User from '../models/User';

type RequestBody = {
    email: string;
    password: string
}

// zod validation
const loginSchema = z.object({
    email: z.string().min(6).email(),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters long")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/\d/, "Password must contain at least one number")
        .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character"),
}).strict();

 const loginValidation = async (req: CustomRequest, res: Response, next: NextFunction) => {
    // validating using zod
    const parsed = loginSchema.safeParse(req.body);  // using safe parse so it dont give error
    if (!parsed.success) {
        next(new CustomError(`${parsed.error.issues[0].message}`, 400));
        return;
    }
    else {
        const { email: emailFromBody, password: passwordFromBody }: RequestBody = req.body;
        // check if email exists
        const user = await User.findOne({ email: emailFromBody })
        if (user) {
            if(!user.isVerified){
                next(new CustomError('Please verify your email to login!', 400));
                return;
            }
            const validPass = await bcrypt.compare(passwordFromBody, user.password)
            if (validPass) {
                req.user = { _id: user._id };   
                next();
            }
            else
            next(new CustomError('Invalid Email or Password', 400));
        }
        else
        next(new CustomError('User not found', 400));
    }

}

export default loginValidation;