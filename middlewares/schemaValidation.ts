
import { z, ZodSchema } from "zod";
import { NextFunction, Request, Response } from "express";
import { CustomError } from "../types"; 

const baseSchema = z.object({
    name: z.string().min(3).optional(),
    email: z.string().min(6).email().optional(),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters long")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/\d/, "Password must contain at least one number")
        .regex(/[!@#$%^&*(),.?\":{}|<>]/, "Password must contain at least one special character")
        .optional(),
}).strict();

export const registerSchema = baseSchema.pick({ name: true, email: true, password: true });
export const loginSchema = z.object({
    email: z.string().min(6).email("Invalid email format"),
    password: z.string().optional(), 
});
export const resetPasswordSchema = baseSchema.pick({ password: true });
export const changePasswordSchema = z.object({
    oldPassword:  z
        .string()
        .min(8, "Password must be at least 8 characters long")
        .optional(),
    newPassword:  z
        .string()
        .min(8, "Password must be at least 8 characters long")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/\d/, "Password must contain at least one number")
        .regex(/[!@#$%^&*(),.?\":{}|<>]/, "New Password must contain at least one special character")
        .optional(),
})

export const validateRequest = (schema: ZodSchema<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            schema.parse(req.body);
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                const errorMessage = error.errors.map(e => e.message).join(", ");
                next(new CustomError(errorMessage, 400));
            } else {
                next(new CustomError("Validation failed", 400));
            }
        }
    };
};
