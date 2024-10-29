import { Response, Request, NextFunction } from "express";
import {CustomRequest , CustomError} from "../../types";
import {User} from "../../models";
import bcrypt from 'bcrypt';
import { sendOtpEmail } from "../index";
import jwt from "jsonwebtoken";

type RequestBody = {
    name: string;
    email: string;
    password: string
}
export const registerUser = async (req: Request, res: Response,next:NextFunction) => {
    const { name, email, password }: RequestBody = req.body;

    const emailExist = await User.findOne({ email })
    if (emailExist){
        next(new CustomError('Email allready exists !!', 400));
        return;
    }

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
        sendOtpEmail(req, res,next);
        res.status(201).send({
            success: true,
            message: 'OTP sent to your email',
            user: {
                id: user._id, 
            },
        });
    } catch (err) {
        next(new CustomError('Something went wrong', 500));
    }
}

export const loginUser = async (req: CustomRequest, res: Response , next: NextFunction) => {
    // create & assign a JWT
    try {
        const { email , password } = req.body ;
        const user = await User.findOne({ email})
        if (!user) {
            next(new CustomError('User not found', 400));
            return;
        }
        if(!user.isVerified){
            next(new CustomError('Please verify your email to login!', 400));
            return;
        }
        const validPass = await bcrypt.compare(password , user.password)
        if (validPass) {
            req.user = { _id: user._id };   
            next();
        }
        else
            next(new CustomError('Invalid Email or Password', 400));
        
        const token = jwt.sign({ id: req.user?._id }, process.env.JWT_SECRET as string , {
            expiresIn: process.env.JWT_LIFETIME
        });
        res.header('Authorization', `Bearer ${token}`).send({
            success: true,
            message: 'Logged in successfully!',
            token: token,
        });
    } catch (error) {
        next(new CustomError('Something went wrong', 500));
    }

}