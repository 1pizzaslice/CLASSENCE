import { Request, Response, NextFunction } from "express";

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
export const registerValidation = async (req: Request, res: Response, next: NextFunction) => {
    // validating using zod
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).send({
            success: false,
            error: parsed.error, // validation error
        });
        return;
    }
    else {
        const { email: emailFromBody }: RequestBody = req.body;
        // checking to see if the user is already registered
        const emailExist = await User.findOne({ email: emailFromBody })
        if (emailExist){
            res.status(400).send({
                success: false,
                message: 'Email already exists!!!',
            });
            return;
        }
        else
            next();
    }
}