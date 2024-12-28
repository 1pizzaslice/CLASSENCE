"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = exports.changePasswordSchema = exports.resetPasswordSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
const types_1 = require("../types");
const baseSchema = zod_1.z.object({
    name: zod_1.z.string().min(3, "Name should be more than 3 Characters.").optional(),
    email: zod_1.z.string().min(6).email().optional(),
    password: zod_1.z
        .string()
        .min(8, "Password must be at least 8 characters long")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/\d/, "Password must contain at least one number")
        .regex(/[!@#$%^&*(),.?\":{}|<>]/, "Password must contain at least one special character")
        .optional(),
}).strict();
exports.registerSchema = baseSchema.pick({ name: true, email: true, password: true });
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().min(6).email("Invalid email format"),
    password: zod_1.z.string().optional(),
});
exports.resetPasswordSchema = baseSchema.pick({ password: true });
exports.changePasswordSchema = zod_1.z.object({
    oldPassword: zod_1.z
        .string()
        .min(8, "Password must be at least 8 characters long")
        .optional(),
    newPassword: zod_1.z
        .string()
        .min(8, "Password must be at least 8 characters long")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/\d/, "Password must contain at least one number")
        .regex(/[!@#$%^&*(),.?\":{}|<>]/, "New Password must contain at least one special character")
        .optional(),
});
const validateRequest = (schema) => {
    return (req, res, next) => {
        try {
            schema.parse(req.body);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                const errorMessage = error.errors.map(e => e.message).join(", ");
                next(new types_1.CustomError(errorMessage, 400));
            }
            else {
                next(new types_1.CustomError("Validation failed", 400));
            }
        }
    };
};
exports.validateRequest = validateRequest;
