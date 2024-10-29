import { z } from "zod";
import { Request, Response, NextFunction } from "express";
import  { CustomError } from "../types";

const passwordSchema = z.object({
    newPassword: z
        .string()
        .min(8, "Password must be at least 8 characters long")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/\d/, "Password must contain at least one number")
        .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character"),
}).strict();

const passwordValidation = async (req: Request, res: Response, next: NextFunction) => {
    // validating using zod
    const parsed = passwordSchema.safeParse(req.body);
    if (!parsed.success) {
        next(new CustomError(`${parsed.error}`, 400));
        return;
    }
    else {
            next();
    }
}

export default passwordValidation;