import { Request, Response, NextFunction } from 'express'
import CustomRequest from "../types/customRequest";
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
    password: z.string().min(6)
}).strict();

export const loginValidation = async (req: CustomRequest, res: Response, next: NextFunction) => {
    // validating using zod
    const parsed = loginSchema.safeParse(req.body);  // using safe parse so it dont give error
    if (!parsed.success)
        res.status(400).send(parsed.error)
    else {
        const { email: emailFromBody, password: passwordFromBody }: RequestBody = req.body;
        // check if email exists
        const user = await User.findOne({ email: emailFromBody })
        if (user) {
            
            const validPass = await bcrypt.compare(passwordFromBody, user.password)
            if (validPass) {
                req.user = { _id: user._id };   
                next();
            }
            else
            res.status(400).send({
                success: false,
                message: 'Invalid Email or Password!',
            });
        }
        else
        res.status(400).send({
            success: false,
            message: 'Invalid Email or Password!',
        });
    }

}