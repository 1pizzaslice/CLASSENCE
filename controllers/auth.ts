import { Response, Request } from "express";
import CustomRequest from "../types/customRequest";
import User from "../models/User";
import bcrypt from 'bcrypt';
import jwt from "jsonwebtoken";

type RequestBody = {
    name: string;
    email: string;
    password: string
}
export const registerUser = async (req: Request, res: Response) => {
    const { name, email, password }: RequestBody = req.body;

    // hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // store user in db
    const user = new User({
        name: name,
        email: email,
        password: hashedPassword
    });
    try {
        await user.save();
        res.send({ user: user._id })
    } catch (err) {
        res.status(400).send(err)
    }
}

export const loginUser = async (req: CustomRequest, res: Response) => {
    // create & assign a JWT
    const token = jwt.sign({ id: req.user?._id }, process.env.JWT_SECRET as string , {
        expiresIn: process.env.JWT_LIFETIME
    });
    res.header('Authorization', `Bearer ${token}`).send(token);
}