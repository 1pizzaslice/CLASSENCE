import { Request, Response, NextFunction } from "express";
import {CustomError } from "../types";

import { z } from "zod";
import User from "../models/User";

// zod Validations
const registerSchema = z.object({
    name: z.string().min(3),
    email: z.string().min(6).email(),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters long")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/\d/, "Password must contain at least one number")
        .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character"),
}).strict();

type RequestBody = {
    email: string;
}
const registerValidation = async (req: Request, res: Response, next: NextFunction) => {
    // validating using zod
    try {
        const parsed = registerSchema.safeParse(req.body);
        if (!parsed.success) {
            next(new CustomError(`${parsed.error}`, 400));
            return;
        }
        else {
            const { email: emailFromBody }: RequestBody = req.body;
            // checking to see if the user is already registered
            const emailExist = await User.findOne({ email: emailFromBody })
            if (emailExist){
                next(new CustomError('Email allready exists !!', 400));
                return;
            }
            else
                next();
        }
    } catch (error) {
        next(new CustomError('Something went wrong', 500));
    }
}
export default registerValidation;